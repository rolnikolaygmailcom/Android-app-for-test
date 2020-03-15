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

import * as firebase from "firebase-admin";

const FIRESTORE_USERS_COLLECTION = 'users'

/* InstanceIdManager is part of Model layer.
 * It manages InstanceIds of users, which is used to send push notification to users.
 */
export class InstanceIdManager {
  private usersCollectionReference: FirebaseFirestore.CollectionReference;

  constructor(firebaseApp: firebase.app.App) {
    this.usersCollectionReference = firebaseApp.firestore().collection(FIRESTORE_USERS_COLLECTION)
  }

  // Register a device instanceId to an user
  async registerInstanceId(userId: string, instanceId: string): Promise<void> {
    // STEP 1: Fetch the user document from Firestore
    const userDocument = await this.usersCollectionReference.doc(userId).get();
    if (userDocument.exists) {
      // STEP 2a: If the document exists, add the Instance ID to the user's list of FCM tokens
      let tokens: Array<string> = userDocument.data().fcmTokens;
      if (!tokens) {
        tokens = [];
      }
      if (tokens.indexOf(instanceId) === -1) {
        tokens.push(instanceId);
        await userDocument.ref.update({ fcmTokens: tokens });
      }
    } else {
      // STEP 2b: If the document doesn't exist, create a new one with the Instance ID
      const tokens = [instanceId];
      await userDocument.ref.set({ fcmTokens: tokens });
    }
  }

  /* Unregister a device instanceId from an user
   */
  async unregisterInstanceId(userId:string, instanceId: string): Promise<void> {
    // STEP 1: Fetch the user document from Firestore
    const userDocument = await this.usersCollectionReference.doc(userId).get();
    if (userDocument.exists) {
      // STEP 2: If the document exists, remove the Instance ID to the user's list of FCM tokens
      const tokens: Array<string> = userDocument.data().fcmTokens;
      if (tokens) {
        const newTokens = tokens.filter(token => token !== instanceId);
        if (newTokens.length !== tokens.length) {
          await userDocument.ref.update({ fcmTokens: newTokens });
        }
      } else {
        // The user doesn't exist, which is an unexpected situation
        // However, we don't need to do handle this case, so just log an warning and move on
        console.warn('Attempted to unregister InstanceId that does not belong to the user. userId =', userId);  
      }
    } else {
      // The user doesn't exist, which is an unexpected situation
      // However, we don't need to do handle this case, so just log an warning and move on
      console.warn('Attempted to unregister InstanceId of an non-existent user. userId =', userId);
      return;
    }
  }

  /* Get a list of instanceIds that are currently registerd to an user.
   * It can be used to send push notifications to all devices owned by the user
   */
  async getInstanceIds(userId: string): Promise<Array<string>> {
    // STEP 1: Fetch the user document from Firestore
    const userDocument = await this.usersCollectionReference.doc(userId).get();

    // STEP 2: Return the list of Instance IDs (FCM tokens) inside the document
    return userDocument.data().fcmTokens ? userDocument.data().fcmTokens : []
  }
}
