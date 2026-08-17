# Owner Runbook

Use this guide only after the Netlify project has Identity enabled, public registration disabled, and your invited account has the exact `owner` role. The owner area is for the small public-settings contract; it is not an inquiry, reservation, payment, or guest-record system.

## Sign in and out

1. Open `/owner` on the production site and use the invitation, sign-in, or recovery flow.
2. After access is confirmed, open `/owner/dashboard`. If access is refused, confirm the invited account has the exact `owner` role in Netlify Identity; do not rely on a visible dashboard alone.
3. Use **Log out** when finished, especially on a shared device. Closing a tab is not a logout check.

## Permitted edits

The dashboard can change only these provisional public settings: starting weekly rate, minimum stay, pricing note, pool heat fee, pet fee, maximum pets, and recurring pool opening and closing dates. Each control displays its allowed range or format, fallback, public destination, and help text.

Before publishing any change, confirm it is owner-approved, accurate, and suitable for public display. Do not put guest information, reservation data, payment data, Identity data, agreement text, unrestricted HTML, or unapproved policies into these fields. The field contract, meanings, destinations, fallbacks, and help text still require explicit owner approval before launch.

## Save and restore

1. Review all eight values because the dashboard saves the complete validated settings object, not a partial update.
2. Select **Save all settings** and wait for the success message. A validation, expired-session, permission, conflict, or service message means the change is not confirmed; resolve that message before trying again.
3. Confirm the current values and last-saved time refresh after a successful save.
4. To recover a prior version, choose its **Restore** control, review the confirmation, and confirm only the intended saved time. The current settings are saved as a recovery point before restoration.
5. Verify the refreshed values after restore. Saved version contents remain private until restored.

## Review availability requests

1. Review submissions in Netlify Forms; that record is the durable inquiry path. Treat email notification as a prompt, not the only record.
2. Check the requested arrival and departure dates against the authoritative Airbnb and Vrbo calendars. The site states these calendars currently sync and no separate master calendar is maintained.
3. Review guest fit, requested guest and pet counts, and any date-specific considerations. A submitted request is not a reservation and does not guarantee availability or price.
4. Reply using the owner-approved communication process. Confirm availability, total price, agreement, and payment steps separately before any reservation is complete.

## Quote, agreement, and payment handoff

The website does not take payment, issue binding terms, or create a reservation. Prepare and send the date-specific quote, owner-approved rental agreement, and payment instructions outside this site. Confirm each step through the approved owner process; do not treat a form submission or notification as acceptance, payment, or a completed reservation.

## When something is wrong

If a public value looks wrong, do not overwrite it reflexively. Check the last-saved time and restore the relevant saved version if appropriate. If the dashboard is unavailable, preserve the current public fallback and escalate to the deployment owner rather than placing data in another system. For a missing inquiry notification, check the Netlify Forms record first and then the notification configuration.
