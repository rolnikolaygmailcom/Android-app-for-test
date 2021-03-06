
# Android-test-app

This is an app for testing purposes. I developed while handling a project related to new connections with Google Play, working in Fortumo as a Project manager.

[Fortumo](https://fortumo.com/) provides carrier billing and is connected to more than 280 mobile operator networks in 80+ countries. 

As we provide carrier billing services for [Google Play](https://play.google.com/store?hl=en) we need a way to test new connection between mobile operator, us and GP (if transaction is processed/charged or not). What we did we purchased an random app on GP in a new country (which is costly and we do not control the flow). Thus we needed to have our own app to test new connections and have higher control.

**Business requirements:**
  1. develope an app and publish it on Google Play;
  2. integrate subscription products in the app using [Google Play Billing Library](https://developer.android.com/google/play/billing/billing_library_overview);
  3. only Fortumo employee with relevant Google account email can authorise and login into the app;
  4. keep track of users who authorise into the app;
  5. keep track of subscriptions made inside the app.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

What things you need:
* A [Google Play Developer Account](https://play.google.com/apps/publish/signup/). It is used to publish the app and manage subscriptions;
* A [Firebase project](https://firebase.google.com/). It is neccessary to enable and track authorisations to the app, deploy the server implementation on Cloud Functions for Firebase, and support Firebase Cloud Messaging;
* A [Google Cloud Console project](https://cloud.google.com/gcp/?utm_source=google&utm_medium=cpc&utm_campaign=emea-emea-all-en-dr-bkws-all-all-trial-e-gcp-1008073&utm_content=text-ad-none-any-DEV_c-CRE_167357371895-ADGP_Hybrid+%7C+AW+SEM+%7C+BKWS+~+EXA_M:1_EMEA_EN_General_Cloud_cloud+google+console-KWID_43700016295371279-kwd-87457409354-userloc_9061558&utm_term=KW_cloud%20google%20console-NET_g-PLAC_&ds_rl=1242853&ds_rl=1245734&ds_rl=1245734&gclid=EAIaIQobChMI5dzJ9eiX6AIVj8qyCh1qwQ6lEAAYASAAEgLMefD_BwE). It is needed to use the Google Play APIs;

## Built With

* [Node.js](https://nodejs.org/en/download/), 
* [npm](https://docs.npmjs.com/cli/install), 
* [Firebase CLI](https://firebase.google.com/?gclid=EAIaIQobChMI3cepoemX6AIVyaiaCh3PNwHbEAAYASAAEgLqQfD_BwE), 
* [Android Studio](https://developer.android.com/studio).

### Setting up

1. Change the package name in the app;
2. Upload an app to Google Play Console;
3. Setup your Firebase Project;
4. When complete Firebase Project setup you receive ```google-services.json```
5. Link your Google Cloud Console project to the Google Play Developer Account;
6. Complete Real-time Developer Notifications Setup
7. Using the packages in FortumoServer folder deploy the the backend server.
 Run ```npm install``` to install dependencies

Configure Cloud Functions for Firebase with your Android app and subscription products
```
firebase use --add {your_firebase_project_id}
```
```
firebase functions:config:set app.package_name="your_android_application_id"
```
```
firebase functions:config:set app.basic_plan_sku="your_basic_subscription_product_sku_id"
```
```
firebase functions:config:set app.premium_plan_sku="your_premium_subscription_product_sku_id"
```
Run ```firebase deploy``` to deploy your backend to Cloud Functions for Firebase.

## Acknowledgments

* This was possible to do with the help of this [sample](https://github.com/android/play-billing-samples/tree/master/ClassyTaxiJava)
