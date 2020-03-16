
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

### Installing

A step by step series of examples that tell you how to get a development env running

Say what the step will be

```
Give the example
```

And repeat

```
until finished
```

End with an example of getting some data out of the system or using it for a little demo

## Running the tests

Explain how to run the automated tests for this system

### Break down into end to end tests

Explain what these tests test and why

```
Give an example
```

## Deployment

Add additional notes about how to deploy this on a live system


## Acknowledgments

* This was possible to do with the help of this [sample](https://github.com/android/play-billing-samples/tree/master/ClassyTaxiJava)
