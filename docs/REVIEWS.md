# The Review System

> Ensure high translation quality by requiring human verification before texts go live in your applications.

glide. features a built-in approval workflow to ensure high translation quality before texts go live in your applications.

## 1. How It Works (The Lifecycle)

When the Review System is engaged, translations do not go live immediately. Instead, they pass through a drafting phase:

- **Drafting:** When a translator enters a new text, it is saved as a `draftValue` and the translation's `reviewStatus` is set to `PENDING_REVIEW`.
- **Approval:** A designated Reviewer checks the draft. Upon approval, the `draftValue` is moved to the live `value` field, and the status is cleared. The text is now public.
- **Rejection:** If a translation is incorrect, the Reviewer rejects it. The status changes to `REJECTED`, indicating that changes are required before it can be approved.

## 2. Activating the Review Mode

The review system is completely optional and must be explicitly enabled. It can be enforced on two different levels depending on your needs:

- **Project Level:** You can activate the review mode for a specific project via the **Project Settings**. If enabled for a project, *every single translation* entered by anyone (except admins and reviewers) in that project must pass through the review process before going live.
- **User Level (User Management):** If you don't want to enforce global reviews, you can activate it for specific individuals only via the **Admin Dashboard > Users**. By enabling the `Requires Review` flag for a specific user (e.g., a new "test translator" or an external agency), only their translations are sent to the review queue. Trusted users can continue to bypass the queue.

## 3. Who can Review?

Not everyone can approve translations. 

> [!IMPORTANT]
> To approve or reject a draft, a user must have the **`isReviewer`** flag enabled in their account settings, or they must be an Administrator. 

## 4. Bulk Imports

When importing a JSON file via the API or the dashboard, you can optionally pass an `importAsPending: true` flag. This will force all imported keys into the review queue, which is extremely useful when importing machine-translated files or texts from external translation agencies that still need a human check.

## 5. Glossary Auto-Fix

When users utilize the **Auto-Fix** functionality (either individual or bulk) to correct Glossary linting errors in Key Names, these changes will **always** be placed into the review queue (`PENDING_REVIEW`), regardless of the user's role or the project's review settings. 

> [!NOTE]
> This ensures that automated renaming is always verified by human eyes before becoming active.
