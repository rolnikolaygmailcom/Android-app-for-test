/**
 * Copyright 2018 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from "chai";

import { TestConfig } from "./TestConfig";
import RandomGenerator from "./mocks/RandomGenerator";
import { SkuType, DeveloperNotification, NotificationType } from "../../src/play-billing";

const testConfig = TestConfig.getInstance();
const playBilling = testConfig.playBilling;
const apiClientMock = testConfig.playApiClientMock;
const packageName = 'somePackageName';
const sku = 'someSubsSku'

describe('Register a subscription purchase, then cancel it, and resignup before it expires and register the new one', () => {
  let randomOriginalPurchaseToken: string;
  let randomOriginalUserId: string;

  before(async () => {
    // Assume a brand new purchase, avoid conflict by using random orderId and purchaseToken
    const newPurchasePlayApiResponse: any = {
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: Date.now() - 100000,
      expiryTimeMillis: Date.now() + 100000,
      autoRenewing: true,
      priceCurrencyCode: "JPY",
      priceAmountMicros: "99000000",
      countryCode: "JP",
      developerPayload: "",
      orderId: RandomGenerator.generateRandomOrderId()
    };
    apiClientMock.mockResponse(newPurchasePlayApiResponse);

    randomOriginalUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    randomOriginalPurchaseToken = "token" + RandomGenerator.generateUniqueIdFromTimestamp();

    // Register the purchase to the user
    await playBilling.purchases().registerToUserAccount(
      packageName,
      sku,
      randomOriginalPurchaseToken,
      SkuType.SUBS,
      randomOriginalUserId
    );

    // Assume cancel the purchase auto renewal
    /// First by update Play Developer API mock response
    newPurchasePlayApiResponse.autoRenewing = false;
    newPurchasePlayApiResponse.cancelReason = '0';
    newPurchasePlayApiResponse.userCancellationTimeMillis = Date.now();
    apiClientMock.mockResponse(newPurchasePlayApiResponse);

    /// And then mock receiving a Realtime Developer notification
    const cancelNotification: DeveloperNotification = {
      version: '1.0',
      packageName: 'string',
      eventTimeMillis: Date.now(),
      subscriptionNotification: {
        version: '1.0',
        notificationType: NotificationType.SUBSCRIPTION_CANCELED,
        purchaseToken: randomOriginalPurchaseToken,
        subscriptionId: sku
      }
    }
    await playBilling.purchases().processDeveloperNotification(packageName, cancelNotification);
  });

  it('should disable the replaced (old) purchase', async () => {
    // Assume a brand new purchase, replacing the previous cancelled purchase
    const newPurchaseReplacedPreviousOnePlayApiResponse: any = {
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: Date.now() + 50000,
      expiryTimeMillis: Date.now() + 100000,
      autoRenewing: true,
      priceCurrencyCode: "JPY",
      priceAmountMicros: "99000000",
      countryCode: "JP",
      developerPayload: "",
      orderId: RandomGenerator.generateRandomOrderId(),
      linkedPurchaseToken: randomOriginalPurchaseToken // Indicate the the purchase replaced an existing one
    };
    apiClientMock.mockResponse(newPurchaseReplacedPreviousOnePlayApiResponse);

    // Register the new purchase to another user
    const randomNewUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    const randomNewPurchaseToken = "token" + RandomGenerator.generateUniqueIdFromTimestamp();
    await playBilling.purchases().registerToUserAccount(
      packageName,
      sku,
      randomNewPurchaseToken,
      SkuType.SUBS,
      randomNewUserId
    );

    // Query subscriptions that has been registered to the original user
    let purchaseList = await playBilling.users().queryCurrentSubscriptions(randomOriginalUserId, sku, packageName);
    expect(purchaseList.length, 'the cancelled purchase registered to the original has been disabled').to.equal(0);

    // Query subscriptions that has been registered to the transfer target user
    purchaseList = await playBilling.users().queryCurrentSubscriptions(randomNewUserId, sku, packageName);
    expect(purchaseList.length, 'the new user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'and the purchase is indeed the new purchase').to.equal(randomNewPurchaseToken);
  });
});

describe('Register a subscription purchase, then upgrade it', () => {
  let randomOriginalPurchaseToken, randomUpgradedPurchaseToken: string;
  let randomUserId: string;

  before(async () => {
    // Assume a brand new purchase, avoid conflict by using random orderId and purchaseToken
    const originalPurchasePlayApiResponse: any = {
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: Date.now() - 100000,
      expiryTimeMillis: Date.now() + 100000,
      autoRenewing: true,
      priceCurrencyCode: "JPY",
      priceAmountMicros: "99000000",
      countryCode: "JP",
      developerPayload: "",
      orderId: RandomGenerator.generateRandomOrderId()
    };
    apiClientMock.mockResponse(originalPurchasePlayApiResponse);

    randomUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    randomOriginalPurchaseToken = "token" + RandomGenerator.generateUniqueIdFromTimestamp();

    // Register the purchase to the user
    await playBilling.purchases().registerToUserAccount(
      packageName,
      sku,
      randomOriginalPurchaseToken,
      SkuType.SUBS,
      randomUserId
    );

    // Assume that the purchase is upgraded
    const upgradedPurchasePlayApiResponse: any = {
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: Date.now(),
      expiryTimeMillis: Date.now() + 50000,
      autoRenewing: true,
      priceCurrencyCode: "JPY",
      priceAmountMicros: "199000000",
      countryCode: "JP",
      developerPayload: "",
      orderId: RandomGenerator.generateRandomOrderId(),
      linkedPurchaseToken: randomOriginalPurchaseToken
    };
    apiClientMock.mockResponse(upgradedPurchasePlayApiResponse);

    randomUpgradedPurchaseToken = "token" + RandomGenerator.generateUniqueIdFromTimestamp();

    // Register the upgraded purchase to the user
    await playBilling.purchases().registerToUserAccount(
      packageName,
      sku,
      randomUpgradedPurchaseToken,
      SkuType.SUBS,
      randomUserId
    );
  });

  it('should result in the user only having the upgraded subscription', async () => {
    // Query subscriptions that has been registered to the user
    const purchaseList = await playBilling.users().queryCurrentSubscriptions(randomUserId);
    expect(purchaseList.length, 'the new user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'and the purchase is indeed the upgraded purchase').to.equal(randomUpgradedPurchaseToken);
  });
});