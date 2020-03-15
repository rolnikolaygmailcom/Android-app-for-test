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

describe("Let's test purchase going through payment failure and recover from there", () => {
  let randomUserId: string;
  let randomPurchaseToken: string;
  let expiryTimeOfOriginalPurchase, 
      expiryTimeOfGracePeriod,
      subscriptionRecoveryTime,
      expiryTimeOfRecoveredAndRenewedPurchase: number;
  let now: number;
  let newPurchasePlayApiResponse: any;
  

  beforeEach(async () => {
    // Assume a brand new purchase, avoid conflict by using random orderId and purchaseToken
    now = Date.now();
    const startTimeOfOriginalPurchase = now - 100000;
    expiryTimeOfOriginalPurchase = now + 100000;
    newPurchasePlayApiResponse = {
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: startTimeOfOriginalPurchase,
      expiryTimeMillis: expiryTimeOfOriginalPurchase,
      autoRenewing: true,
      priceCurrencyCode: "JPY",
      priceAmountMicros: "99000000",
      countryCode: "JP",
      developerPayload: "",
      orderId: RandomGenerator.generateRandomOrderId(),
      paymentState: 1
    };
    apiClientMock.mockResponse(newPurchasePlayApiResponse);

    randomUserId = 'userId' + RandomGenerator.generateUniqueIdFromTimestamp();
    randomPurchaseToken = "token" + RandomGenerator.generateUniqueIdFromTimestamp();

    // Register the purchase to the user
    await playBilling.purchases().registerToUserAccount(
      packageName,
      sku,
      randomPurchaseToken,
      SkuType.SUBS,
      randomUserId
    );

    // Fast forward to after the original purchase has expired, and enter grace period
    testConfig.dateMock.mockCurrentTimestamp(expiryTimeOfOriginalPurchase + 1000);
    const gracePeriodPurchasePlayApiResponse = Object.assign({}, newPurchasePlayApiResponse);
    expiryTimeOfGracePeriod = expiryTimeOfOriginalPurchase + 2000;
    gracePeriodPurchasePlayApiResponse.expiryTimeMillis = expiryTimeOfGracePeriod;
    gracePeriodPurchasePlayApiResponse.orderId = newPurchasePlayApiResponse + '..0';
    gracePeriodPurchasePlayApiResponse.paymentState = 0;
    apiClientMock.mockResponse(gracePeriodPurchasePlayApiResponse);
  });

  const expectPurchaseRecordIsStillActiveInGracePeriod = async () => {
    // Query subscriptions that has been registered to the user
    const purchaseList = await playBilling.users().queryCurrentSubscriptions(randomUserId, sku, packageName);
    expect(purchaseList.length, 'the user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'the purchase match the one we registered earlier').to.equal(randomPurchaseToken);
    expect(purchaseList[0].isEntitlementActive(), 'the subscription is active').to.equal(true);
    expect(purchaseList[0].isGracePeriod(), 'the subscription in grace period').to.equal(true);
  };

  const fastForwardToAccountHold = () => {
    testConfig.dateMock.mockCurrentTimestamp(expiryTimeOfGracePeriod + 1000);
    // In Account Hold, the expiry time is restored to its original value
    const accountHoldPurchasePlayApiResponse = Object.assign({}, newPurchasePlayApiResponse);
    accountHoldPurchasePlayApiResponse.paymentState = 0;
    accountHoldPurchasePlayApiResponse.orderId = newPurchasePlayApiResponse + '..0';
    apiClientMock.mockResponse(accountHoldPurchasePlayApiResponse);
  };

  const expectPurchaseRecordIsInactiveInAccountHold = async () => {
    // Query subscriptions that has been registered to the user
    const purchaseList = await playBilling.users().queryCurrentSubscriptions(randomUserId, sku, packageName);
    expect(purchaseList.length, 'the user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'the purchase match the one we registered earlier').to.equal(randomPurchaseToken);
    expect(purchaseList[0].isEntitlementActive(), 'the subscription is active').to.equal(false);
    expect(purchaseList[0].isAccountHold(), 'the subscription is active').to.equal(true);
  };

  const fastForwardToRecoverAndRenewal = () => {
    subscriptionRecoveryTime = expiryTimeOfGracePeriod + 100000;
    testConfig.dateMock.mockCurrentTimestamp(subscriptionRecoveryTime);
    const renewedPurchasePlayApiResponse = Object.assign({}, newPurchasePlayApiResponse);
    expiryTimeOfRecoveredAndRenewedPurchase = expiryTimeOfOriginalPurchase + 200000;
    renewedPurchasePlayApiResponse.orderId = newPurchasePlayApiResponse.orderId + '..0';
    renewedPurchasePlayApiResponse.expiryTimeMillis = expiryTimeOfRecoveredAndRenewedPurchase;
    apiClientMock.mockResponse(renewedPurchasePlayApiResponse);
  };

  const expectSubscriptionBecameActiveUponRecovery = async () => {
    // Query subscriptions that has been registered to the user
    const purchaseList = await playBilling.users().queryCurrentSubscriptions(randomUserId, sku, packageName);
    expect(purchaseList.length, 'the user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'the purchase match the one we registered earlier').to.equal(randomPurchaseToken);
    expect(purchaseList[0].isEntitlementActive(), 'the subscription is active').to.equal(true);
    expect(purchaseList[0].expiryTimeMillis, 'the subscription is renewed').to.equal(expiryTimeOfRecoveredAndRenewedPurchase);
  };

  describe('if we have Realtime Developer notification set up', async () => {
    it('the purchase should still be considered active during grace period', async () => {
      const gracePeriodNotification: DeveloperNotification = {
        version: '1.0',
        packageName: 'string',
        eventTimeMillis: expiryTimeOfOriginalPurchase,
        subscriptionNotification: {
          version: '1.0',
          notificationType: NotificationType.SUBSCRIPTION_IN_GRACE_PERIOD,
          purchaseToken: randomPurchaseToken,
          subscriptionId: sku
        }
      }
      await playBilling.purchases().processDeveloperNotification(packageName, gracePeriodNotification);

      await expectPurchaseRecordIsStillActiveInGracePeriod();
    });

    it('the purchase then enter account hold, so should be considered inactive', async () => {
      fastForwardToAccountHold();

      const accountHoldNotification: DeveloperNotification = {
        version: '1.0',
        packageName: 'string',
        eventTimeMillis: expiryTimeOfGracePeriod,
        subscriptionNotification: {
          version: '1.0',
          notificationType: NotificationType.SUBSCRIPTION_ON_HOLD,
          purchaseToken: randomPurchaseToken,
          subscriptionId: sku
        }
      }
      await playBilling.purchases().processDeveloperNotification(packageName, accountHoldNotification);

      await expectPurchaseRecordIsInactiveInAccountHold();
    });

    it('the purchase has been recovered from account hold and renewed, so should become active', async () => {
      fastForwardToRecoverAndRenewal();

      const recoveredNotification: DeveloperNotification = {
        version: '1.0',
        packageName: 'string',
        eventTimeMillis: subscriptionRecoveryTime,
        subscriptionNotification: {
          version: '1.0',
          notificationType: NotificationType.SUBSCRIPTION_RECOVERED,
          purchaseToken: randomPurchaseToken,
          subscriptionId: sku
        }
      }
      await playBilling.purchases().processDeveloperNotification(packageName, recoveredNotification);

      await expectSubscriptionBecameActiveUponRecovery();
    });
  });

  describe('if we do not have Realtime Developer notification set up', async () => {
    it('the purchase should still be considered active during grace period', async () => {
      await expectPurchaseRecordIsStillActiveInGracePeriod();
    });

    it('the purchase then enter account hold, so should be considered inactive', async () => {
      fastForwardToAccountHold();
      await expectPurchaseRecordIsInactiveInAccountHold();
    });

    it('the purchase has been recovered from account hold and renewed, so should become active', async () => {
      fastForwardToRecoverAndRenewal();
      await expectSubscriptionBecameActiveUponRecovery();
    });
  });
});