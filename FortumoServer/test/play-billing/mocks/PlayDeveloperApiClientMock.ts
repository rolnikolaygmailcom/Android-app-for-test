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

export default class PlayDeveloperApiClientMock {
  private _response: any;
  private _error: Error;

  purchases: any; // Mock Google Play Developer API's Purchases APIs

  constructor() {
    this.refresh();
  }

  mockResponse(response: any) {
    this._error = null;
    this._response = response;
    this.refresh();
  }

  mockError(error: Error) {
    this._error = error;
    this._response = null;
    this.refresh();
  }

  private refresh() {
    // console.log('\nrefresh()')
    this.purchases = {
      products: {
        // Mock https://developers.google.com/android-publisher/api-ref/purchases/products/get
        get: this.mockApiCall()
      },
      subscriptions: {
        // Mock https://developers.google.com/android-publisher/api-ref/purchases/subscriptions/get
        get: this.mockApiCall()
      }
    };
  }

  private mockApiCall() {
    const response = this._response;
    const error = this._error;

    // console.log('mockApiCall()')
    // console.log('response=', response)
    // console.log('error=', error)

    return function(
      params: any,
      callback: (error: Error, result: any) => void
    ): void {
      // console.log('mockApiCall() -- inner function')
      // console.log('response=', response)
      // console.log('error=', error)
      if (response) {
        callback(null, { data: response });
      } else if (error) {
        callback(error, null);
        return;
      } else
        throw new Error(
          "Invalid mock state. Please define either mock response or mock error."
        );
    };
  }
}

export const TOKEN_NOT_FOUND_ERROR = new Error(
  "The purchase token was not found."
);
