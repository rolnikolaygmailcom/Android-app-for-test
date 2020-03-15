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

import * as firebase from 'firebase-admin';
import * as firebaseServiceAccountJson from "../service-account-firebase.json";
import PlayDeveloperApiClientMock from './mocks/PlayDeveloperApiClientMock';
import DateMock from './mocks/DateMock';
import { PlayBilling } from '../../src/play-billing';

const firebaseServiceAccount:any = firebaseServiceAccountJson;
const TEST_FIREBASE_APP_NAME = 'libraryTestApp';
firebase.initializeApp({
  credential: firebase.credential.cert(firebaseServiceAccount),
  databaseURL: "https://ghdemo-b25b3.firebaseio.com"
}, TEST_FIREBASE_APP_NAME);

export class TestConfig {
  private static _instance: TestConfig;
  private _playBilling: PlayBilling;
  private _playApiClientMock: PlayDeveloperApiClientMock;
  private _dateMock: DateMock;
  
  static getInstance(): TestConfig {
    if (this._instance) {
      return this._instance;
    } else {
      this._instance = new TestConfig();
      return this._instance;
    }
  }

  get playBilling(): PlayBilling {
    return this._playBilling;
  }

  get playApiClientMock(): PlayDeveloperApiClientMock {
    return this._playApiClientMock;
  }

  get dateMock(): DateMock {
    return this._dateMock;
  }

  private constructor() {
    const firebaseApp = firebase.app(TEST_FIREBASE_APP_NAME);
    this._playApiClientMock = new PlayDeveloperApiClientMock();
    this._playBilling = PlayBilling.fromApiClient(this._playApiClientMock, firebaseApp);
    this._dateMock = new DateMock();
  }
}
