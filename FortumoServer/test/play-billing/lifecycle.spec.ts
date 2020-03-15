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

describe('Register a purchase with an user account, then waits for it to auto-renew', () => {
  let randomUserId: string;
  let randomPurchaseToken: string;
  let expiryTimeOfRenewedPurchase: number;
  let now: number;

  beforeEach(async () => {
    // Assume a brand new purchase, avoid conflict by using random orderId and purchaseToken
    now = Date.now();
    const startTimeOfOriginalPurchase = now - 100000;
    const expiryTimeOfOriginalPurchase = now + 100000;
    const newPurchasePlayApiResponse: any = {
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: startTimeOfOriginalPurchase,
      expiryTimeMillis: expiryTimeOfOriginalPurchase,
      autoRenewing: true,
      priceCurrencyCode: "JPY",
      priceAmountMicros: "99000000",
      countryCode: "JP",
      developerPayload: "",
      orderId: RandomGenerator.generateRandomOrderId()
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

    // Fast forward to after the original purchase has expired
    testConfig.dateMock.mockCurrentTimestamp(expiryTimeOfOriginalPurchase + 100000);
    const renewedPurchasePlayApiResponse = Object.assign({}, newPurchasePlayApiResponse);
    expiryTimeOfRenewedPurchase = expiryTimeOfOriginalPurchase + 200000;
    renewedPurchasePlayApiResponse.orderId = newPurchasePlayApiResponse.orderId + '..1';
    renewedPurchasePlayApiResponse.expiryTimeMillis = expiryTimeOfRenewedPurchase;
    apiClientMock.mockResponse(renewedPurchasePlayApiResponse);
  });

  const expectPurchaseRecordHasBeenUpdated = async () => {
    // Query subscriptions that has been registered to the user
    const purchaseList = await playBilling.users().queryCurrentSubscriptions(randomUserId, sku, packageName);
    expect(purchaseList.length, 'the user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'the purchase match the one we registered earlier').to.equal(randomPurchaseToken);
    expect(purchaseList[0].isEntitlementActive(), 'the subscription is active').to.equal(true);
    expect(purchaseList[0].expiryTimeMillis, 'the subscription is renewed').to.equal(expiryTimeOfRenewedPurchase);
  };

  it('then our library should properly handle subscription renewal notification and update the purchase record', async () => {
    /// Mock receiving a Realtime Developer notification
    const renewalNotification: DeveloperNotification = {
      version: '1.0',
      packageName: 'string',
      eventTimeMillis: now,
      subscriptionNotification: {
        version: '1.0',
        notificationType: NotificationType.SUBSCRIPTION_RENEWED,
        purchaseToken: randomPurchaseToken,
        subscriptionId: sku
      }
    }
    await playBilling.purchases().processDeveloperNotification(packageName, renewalNotification);

    // Test if our purchase record has been properly updated
    await expectPurchaseRecordHasBeenUpdated();
  });

  it('and our library should still find out and update purchase records without the renewal notification', async () => {
    // Test if our purchase record has been properly updated
    await expectPurchaseRecordHasBeenUpdated();
  });

  afterEach(() => testConfig.dateMock.reset());
});

describe('Register a purchase with an user account, then waits for it to expire', () => {
  let randomUserId: string;
  let randomPurchaseToken: string;
  let now: number;

  beforeEach(async () => {
    // Assume a brand new purchase, avoid conflict by using random orderId and purchaseToken
    now = Date.now();
    const startTimeOfOriginalPurchase = now - 100000;
    const expiryTimeOfOriginalPurchase = now + 100000;
    const newPurchasePlayApiResponse: any = {
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: startTimeOfOriginalPurchase,
      expiryTimeMillis: expiryTimeOfOriginalPurchase,
      autoRenewing: true,
      priceCurrencyCode: "JPY",
      priceAmountMicros: "99000000",
      countryCode: "JP",
      developerPayload: "",
      orderId: RandomGenerator.generateRandomOrderId()
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

    // Fast forward to after the original purchase has expired
    testConfig.dateMock.mockCurrentTimestamp(expiryTimeOfOriginalPurchase + 100000);
    const expiredPurchasePlayApiResponse = Object.assign({}, newPurchasePlayApiResponse);
    expiredPurchasePlayApiResponse.autoRenewing = false;
    expiredPurchasePlayApiResponse.cancelReason = '0';
    expiredPurchasePlayApiResponse.userCancellationTimeMillis = now;
    apiClientMock.mockResponse(expiredPurchasePlayApiResponse);
  });

  const expectPurchaseRecordHasExpired = async () => {
    // Query subscriptions that has been registered to the user
    const purchaseList = await playBilling.users().queryCurrentSubscriptions(randomUserId, sku, packageName);
    expect(purchaseList.length, 'the user no longer has any active subscription registered to himself').to.equal(0);
  };

  it('then our library should properly handle subscription cancel notification and update the purchase record', async () => {
    /// Mock receiving a Realtime Developer notification
    const cancelNotification: DeveloperNotification = {
      version: '1.0',
      packageName: 'string',
      eventTimeMillis: now,
      subscriptionNotification: {
        version: '1.0',
        notificationType: NotificationType.SUBSCRIPTION_CANCELED,
        purchaseToken: randomPurchaseToken,
        subscriptionId: sku
      }
    }
    await playBilling.purchases().processDeveloperNotification(packageName, cancelNotification);

    // Test if our purchase record has been properly updated
    await expectPurchaseRecordHasExpired();
  });

  it('and our library should still find out and update purchase records without the cancel notification', async () => {
    // Test if our purchase record has been properly updated
    await expectPurchaseRecordHasExpired();
  });

  afterEach(() => testConfig.dateMock.reset());
});

describe('Register a purchase with an user account, then cancel it and then restore', () => {
  let randomUserId: string;
  let randomPurchaseToken: string;
  let expiryTimeOfRenewedPurchase: number;
  let expiryTimeOfOriginalPurchase: number;
  let startTimeOfOriginalPurchase: number;
  let newPurchasePlayApiResponse: any;
  let now: number;

  beforeEach(async () => {
    // Assume a brand new purchase, avoid conflict by using random orderId and purchaseToken
    now = Date.now();
    startTimeOfOriginalPurchase = now - 100000;
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
      orderId: RandomGenerator.generateRandomOrderId()
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
  });

  const simulatePurchaseCancellation = () => {
    const cancelledPurchasePlayApiResponse = Object.assign({}, newPurchasePlayApiResponse);
    cancelledPurchasePlayApiResponse.autoRenewing = false;
    cancelledPurchasePlayApiResponse.cancelReason = '0';
    cancelledPurchasePlayApiResponse.userCancellationTimeMillis = now + 1000;
    apiClientMock.mockResponse(cancelledPurchasePlayApiResponse);
  }

  const simulatePurchaseRestoration = () => {
    const restoredPurchasePlayApiResponse = Object.assign({}, newPurchasePlayApiResponse);
    apiClientMock.mockResponse(restoredPurchasePlayApiResponse);
  }

  const fastForwardToAfterPurchaseRenewal = () => {
    // Fast forward to after the original purchase has expired
    testConfig.dateMock.mockCurrentTimestamp(expiryTimeOfOriginalPurchase + 100000);
    const renewedPurchasePlayApiResponse = Object.assign({}, newPurchasePlayApiResponse);
    expiryTimeOfRenewedPurchase = expiryTimeOfOriginalPurchase + 200000;
    renewedPurchasePlayApiResponse.orderId = newPurchasePlayApiResponse.orderId + '..1';
    renewedPurchasePlayApiResponse.expiryTimeMillis = expiryTimeOfRenewedPurchase;
    apiClientMock.mockResponse(renewedPurchasePlayApiResponse);
  }

  const expectSubscriptionIsStillActive = async () => {
    // Query subscriptions that has been registered to the user
    const purchaseList = await playBilling.users().queryCurrentSubscriptions(randomUserId, sku, packageName);
    expect(purchaseList.length, 'the user has only one subscription registered to himself').to.equal(1);
    expect(purchaseList[0].purchaseToken, 'the purchase match the one we registered earlier').to.equal(randomPurchaseToken);
    expect(purchaseList[0].isEntitlementActive(), 'the subscription is active').to.equal(true);
    expect(purchaseList[0].expiryTimeMillis, 'the subscription is renewed').to.equal(expiryTimeOfRenewedPurchase);
  };

  it('then our library should handle cancel notification and renewal notification, then update the purchase record', async () => {
    simulatePurchaseCancellation();
    /// Mock receiving a Realtime Developer notification - cancel notification
    const cancelNotification: DeveloperNotification = {
      version: '1.0',
      packageName: 'string',
      eventTimeMillis: now + 1000,
      subscriptionNotification: {
        version: '1.0',
        notificationType: NotificationType.SUBSCRIPTION_CANCELED,
        purchaseToken: randomPurchaseToken,
        subscriptionId: sku
      }
    }
    await playBilling.purchases().processDeveloperNotification(packageName, cancelNotification);

    simulatePurchaseRestoration();
    /// Mock receiving a Realtime Developer notification - cancel notification
    const restoreNotification: DeveloperNotification = {
      version: '1.0',
      packageName: 'string',
      eventTimeMillis: now + 1000,
      subscriptionNotification: {
        version: '1.0',
        notificationType: NotificationType.SUBSCRIPTION_RESTARTED,
        purchaseToken: randomPurchaseToken,
        subscriptionId: sku
      }
    }
    await playBilling.purchases().processDeveloperNotification(packageName, restoreNotification);

    fastForwardToAfterPurchaseRenewal();
    /// Mock receiving a Realtime Developer notification
    const renewalNotification: DeveloperNotification = {
      version: '1.0',
      packageName: 'string',
      eventTimeMillis: expiryTimeOfOriginalPurchase,
      subscriptionNotification: {
        version: '1.0',
        notificationType: NotificationType.SUBSCRIPTION_RENEWED,
        purchaseToken: randomPurchaseToken,
        subscriptionId: sku
      }
    }
    await playBilling.purchases().processDeveloperNotification(packageName, renewalNotification);

    // Test if our purchase record has been properly updated
    await expectSubscriptionIsStillActive();
  });

  it('and our library should still find out that the subscription is renewed without all the notifications', async () => {
    simulatePurchaseCancellation();
    simulatePurchaseRestoration();
    fastForwardToAfterPurchaseRenewal();

    // Test if our purchase record has been properly updated
    await expectSubscriptionIsStillActive();
  });

  afterEach(() => testConfig.dateMock.reset());
});