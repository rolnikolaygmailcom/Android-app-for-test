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
import { SkuType, PurchaseUpdateError } from "../../src/play-billing";

const testConfig = TestConfig.getInstance();
const playBilling = testConfig.playBilling;
const apiClientMock = testConfig.playApiClientMock;
const packageName = 'somePackageName';
const sku = 'someSubsSku'

describe("Query a subscription purchase that has never been registered before", () => {
  it("should return a SubscriptionPurchase object with userId === null", async () => {
    const newPurchasePlayApiResponse = {
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

    const purchase = await playBilling.purchases().querySubscriptionPurchase(
      packageName,
      sku,
      "token" + RandomGenerator.generateUniqueIdFromTimestamp()
    );

    expect(purchase.userId, "userId === undefined").to.equal(undefined);
  });
});

describe('Register a valid purchase token', () => {
  let newRandomUserId: string;
  let newRandomPurchaseToken: string;

  beforeEach(async () => {
    // Assume a brand new purchase, avoid conflict by using random orderId and purchaseToken
    const newPurchasePlayApiResponse = {
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

    newRandomUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    newRandomPurchaseToken = "token" + RandomGenerator.generateUniqueIdFromTimestamp();

    // Register the purchase to the user
    await playBilling.purchases().registerToUserAccount(
      packageName,
      sku,
      newRandomPurchaseToken,
      SkuType.SUBS,
      newRandomUserId
    );
  });

  it('should succeed if the purchase has never been registered before', async () => {
    // Query the purchase that has been registered
    const purchase = await playBilling.purchases().querySubscriptionPurchase(
      packageName,
      sku,
      newRandomPurchaseToken
    );
    expect(purchase.userId, 'userId match the one being registered').to.equal(newRandomUserId);

    // Query subscriptions that has been registered to the user
    const purchaseList = await playBilling.users().queryCurrentSubscriptions(newRandomUserId, sku, packageName);
    expect(purchaseList.length, 'the new user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'the purchase match the one we registered earlier').to.equal(newRandomPurchaseToken);
  });

  it('should fail if we attempt to register an already-registered purchase to another user', async () => {
    // Attempt to register the purchase to yet another user
    const yetAnotherNewRandomUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    let didThrowError = false;
    try {
      await playBilling.purchases().registerToUserAccount(
        packageName,
        sku,
        newRandomPurchaseToken,
        SkuType.SUBS,
        yetAnotherNewRandomUserId
      );
    } catch (err) {
      didThrowError = true;
      expect(err.name, 'throwed PurchaseUpdateError.CONFLICT error').to.equal(PurchaseUpdateError.CONFLICT);
    }
    expect(didThrowError, 'purchase registration attempt did throw an error').to.equal(true);
  });

  it('and then transfer it to another user should also succeed', async () => {
    // Attempt to transfer the purchase to yet another user
    const yetAnotherNewRandomUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    await playBilling.purchases().transferToUserAccount(
      packageName,
      sku,
      newRandomPurchaseToken,
      SkuType.SUBS,
      yetAnotherNewRandomUserId
    );

    // Query subscriptions that has been registered to the original user
    let purchaseList = await playBilling.users().queryCurrentSubscriptions(newRandomUserId, sku, packageName);
    expect(purchaseList.length, 'the original has no subscription registered to himself').to.equal(0);

    // Query subscriptions that has been registered to the transfer target user
    purchaseList = await playBilling.users().queryCurrentSubscriptions(yetAnotherNewRandomUserId, sku, packageName);
    expect(purchaseList.length, 'the transfer target user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'the purchase match the one we transfered earlier').to.equal(newRandomPurchaseToken);
  });
});

describe('Register an invalid purchase token', () => {
  it('should fail', async () => {
    const invalidTokenPlayApiError = new Error('Invalid token');
    invalidTokenPlayApiError['code'] = 404;
    apiClientMock.mockError(invalidTokenPlayApiError);

    const newRandomUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    const newRandomPurchaseToken = "token" + RandomGenerator.generateUniqueIdFromTimestamp();

    // Register the purchase to the user
    let didThrowError = false;
    try {
      await playBilling.purchases().registerToUserAccount(
        packageName,
        sku,
        newRandomPurchaseToken,
        SkuType.SUBS,
        newRandomUserId
      );
    } catch (err) {
      didThrowError = true;
      expect(err.name, 'throwed PurchaseUpdateError.INVALID_TOKEN error').to.equal(PurchaseUpdateError.INVALID_TOKEN);
    }
    expect(didThrowError, 'purchase registration attempt did throw an error').to.equal(true);
  });
});

describe('Transfer an invalid purchase token', () => {
  it('should fail', async () => {
    const invalidTokenPlayApiError = new Error('Invalid token');
    invalidTokenPlayApiError['code'] = 404;
    apiClientMock.mockError(invalidTokenPlayApiError);

    const newRandomUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    const newRandomPurchaseToken = "token" + RandomGenerator.generateUniqueIdFromTimestamp();

    // Register the purchase to the user
    let didThrowError = false;
    try {
      await playBilling.purchases().transferToUserAccount(
        packageName,
        sku,
        newRandomPurchaseToken,
        SkuType.SUBS,
        newRandomUserId
      );
    } catch (err) {
      didThrowError = true;
      expect(err.name, 'throwed PurchaseUpdateError.INVALID_TOKEN error').to.equal(PurchaseUpdateError.INVALID_TOKEN);
    }
    expect(didThrowError, 'purchase registration attempt did throw an error').to.equal(true);
  });
});