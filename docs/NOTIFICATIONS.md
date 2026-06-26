# Notifications & Webhooks

> Configure instant alerts and webhooks in glide. to receive updates on translation approvals, low quotas, and system events.

glide. features a built-in alert system that allows you to receive instant notifications for important events directly to your preferred communication channels. Each user can configure their own personal alerts in their **Account Settings**.

## 1. Supported Providers

Currently, glide. supports the following notification providers out of the box:

- **Discord (Webhooks):** Receive alerts in your Discord server channels.
- **Slack (Webhooks):** Send alerts to a Slack channel via Incoming Webhooks.
- **Telegram Bot:** Send push notifications directly to your phone via the Telegram app. Use an endpoint like `https://api.telegram.org/bot<bot_token>/sendMessage?chat_id=<chat_id>`.
- **ntfy.sh:** An open-source, free push notification service. Send alerts directly to your phone via the ntfy app by subscribing to a custom topic URL (e.g., `https://ntfy.sh/my_secret_topic`).
- **Gotify:** A self-hosted push notification service. Use a URL like `https://gotify.example.com/message?token=<app_token>`.
- **Custom Webhooks:** Forward events to your own server or automation tools (like n8n, Make, or Zapier). Custom webhooks receive a POST request with the JSON payload.

## 2. Event Types

You can selectively enable notifications for the events that matter most to your workflow. The availability of these events depends on your user role:

### 2.1 For All Users (Translators)
- **Translation Rejected:** 
  - **Trigger:** Sent immediately when an Admin or Reviewer clicks "Reject" on one of your submitted translation drafts.
  - **Rate Limit:** None. Triggered per rejected key.
- **Translation Approved:** 
  - **Trigger:** Sent immediately when an Admin or Reviewer clicks "Approve" on one of your submitted translation drafts.
  - **Rate Limit:** None. Triggered per approved key.
- **Quota Low:** 
  - **Trigger:** Sent whenever you use an AI translation suggestion and your remaining quota drops to 50 or is already below 50.
  - **Rate Limit:** Maximum once every 24 hours per user (to prevent spam when continuing to translate with low quota).

### 2.2 For Reviewers & Admins
- **Pending Reviews:** 
  - **Trigger:** Sent when a Translator without direct publish permissions submits a new translation draft, signaling that a review is needed.
  - **Rate Limit:** Maximum once every 2 hours per reviewer (to prevent spam when a translator submits a batch of keys in a row). *(Available only if you have the Reviewer or Admin role).*

### 2.3 For Admins
- **Backup Failed:** 
  - **Trigger:** Sent when the automated system backup (database dump) fails to upload to the configured S3 bucket.
  - **Rate Limit:** None. Sent for every failed backup attempt. *(Available only for Admins).*

## 3. Setup Guide

1. Log into your glide. instance.
2. Navigate to your **Account Settings** (click your avatar in the bottom left).
3. Scroll down to the **Alerts & Notifications** section.
4. Select your desired **Provider**.
5. Paste your Webhook URL or ntfy topic URL.
6. Check the boxes for the **Events** you want to receive.
7. Click **Save Changes**.
