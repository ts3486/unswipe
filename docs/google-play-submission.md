# Google Play Store Submission Guide — Unmatch

Step-by-step guide to publish Unmatch on Google Play. Assumes you have an Expo Managed project with EAS Build/Submit already configured (which you do).

---

## Prerequisites

Before starting, make sure you have:

- [ ] A **Google Play Developer account** ($25 one-time fee)
  - Sign up at https://play.google.com/console/signup
  - Account approval can take 48 hours, so do this first
- [ ] **EAS CLI** installed and authenticated: `npm install -g eas-cli && eas login`
- [ ] **`pnpm run preflight`** passes (typecheck + lint + test)

---

## Step 1 — Create the App in Google Play Console

1. Go to https://play.google.com/console
2. Click **"Create app"**
3. Fill in the form:
   - **App name**: `Unmatch`
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free (change this only if you plan to charge upfront — you cannot switch from Paid to Free later)
4. Accept the declarations and click **Create app**

---

## Step 2 — Store Listing (Main Store Presence)

Navigate to **Grow > Store presence > Main store listing** and fill in:

### 2.1 App Details

| Field | Requirement | Notes |
|---|---|---|
| **Short description** | Max 80 characters | e.g. "Break free from dating app habits with guided exercises" |
| **Full description** | Max 4,000 characters | Describe what the app does, key features, and who it's for. Avoid medical/cure/treatment claims per CLAUDE.md |

### 2.2 Graphics

| Asset | Size | Format | Notes |
|---|---|---|---|
| **App icon** | 512×512 px | PNG, 32-bit, no alpha | Google Play generates this from your upload (not adaptive icon) |
| **Feature graphic** | 1024×500 px | PNG or JPEG | Displayed at the top of your store listing |
| **Phone screenshots** | Min 2, max 8 | 16:9 or 9:16, min 320px, max 3840px on any side | JPEG or PNG, no alpha. Show key flows: Home, Panic, Progress, Learn |
| **7-inch tablet screenshots** | Optional | Same ratios | Skip if not targeting tablets |
| **10-inch tablet screenshots** | Optional | Same ratios | Skip if not targeting tablets |

> Tip: Use a tool like [screenshots.pro](https://screenshots.pro) or Figma to add device frames and captions to your screenshots.

### 2.3 Save the listing

Click **Save** — you can come back and edit before publishing.

---

## Step 3 — Content Rating (IARC)

Navigate to **Policy > App content > Content ratings**.

1. Click **Start questionnaire**
2. Select category: **Utility / Productivity / Communication / Other** (not a game)
3. Answer the questions honestly:
   - **Violence**: No
   - **Sexual content**: No (CLAUDE.md forbids explicit sexual wording)
   - **Language**: No (no profanity in the app)
   - **Controlled substances**: No
   - **User-generated content**: No (all content is preset)
   - **Personal info shared with third parties**: No (local-only data)
   - **Interactive elements**: None (no social features)
4. Submit the questionnaire — you'll get an **IARC certificate** and content ratings automatically

Expected rating: **Rated for 3+** or **Everyone**

---

## Step 4 — Data Safety Declaration

Navigate to **Policy > App content > Data safety**.

This is Google's privacy nutrition label. Fill it out based on Unmatch's actual data practices:

### 4.1 Data Collection Overview

| Question | Answer | Reason |
|---|---|---|
| Does your app collect or share any user data? | **Yes** (if analytics enabled) / **No** (if shipping without analytics) | Even local data must be declared if analytics SDK is present |
| Is all collected data encrypted in transit? | **Yes** | Analytics SDKs use HTTPS |
| Do you provide a way for users to request data deletion? | **Yes** | Settings > Privacy > Delete All Data |

### 4.2 Data Types (if analytics is enabled)

| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| App interactions | Yes | No | Analytics |
| Crash logs | Yes (if Sentry added) | No | App stability |
| Device/OS info | Yes | No | Analytics / diagnostics |

### 4.3 Data Types — NOT Collected

Explicitly mark these as **not collected**:
- Personal info (name, email, address, phone)
- Financial info (never send spend amounts — per CLAUDE.md)
- Health data
- Messages
- Photos/videos
- Location
- Contacts

### 4.4 Privacy Policy URL

- You **must** provide a publicly accessible privacy policy URL
- Host it at a stable URL (GitHub Pages, Notion public page, your website)
- Paste the URL in the Data Safety section and the Store Listing

---

## Step 5 — Target Audience and App Category

Navigate to **Policy > App content > Target audience**.

1. **Target age group**: Select **18 and over** (safest for a dating-habit app)
   - Selecting any age group under 13 triggers COPPA/teacher-approved requirements
2. **App category**: **Health & Fitness** or **Lifestyle**
3. **Tags**: Add relevant tags (e.g., self-improvement, wellness, habit tracking)

---

## Step 6 — Ads Declaration

Navigate to **Policy > App content > Ads**.

- Does your app contain ads? → **No** (Unmatch has no ads)

---

## Step 7 — Government Apps Declaration

- Is this a government app? → **No**

---

## Step 8 — Financial Features Declaration

Navigate to **Policy > App content > Financial features**.

- If your app has no real IAP at v1: select **No** for all financial features
- If you have subscriptions/IAP: declare them and link to your billing integration

---

## Step 9 — Build the Android AAB

### 9.1 Verify app.json Android Config

Your current config is already set up:

```json
{
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/images/adaptive-icon.png",
      "backgroundColor": "#0B1220"
    },
    "edgeToEdgeEnabled": true,
    "package": "com.unmatch.app",
    "permissions": [
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT"
    ]
  }
}
```

> **Important**: The `package` name (`com.unmatch.app`) is permanent. Once you upload your first build, you cannot change it.

### 9.2 Run Preflight

```bash
pnpm run preflight
```

All checks must pass before building.

### 9.3 Build with EAS

```bash
pnpm run build:android
# or directly:
eas build --platform android --profile production
```

This will:
- Ask you to set up an Android Keystore (first time only — EAS manages this for you)
- Build an `.aab` (Android App Bundle) in the cloud
- Provide a download link when done

> **Keystore warning**: EAS stores your keystore securely. If you ever need to manage it manually, run `eas credentials`. **Never lose your upload keystore** — you cannot update an app without the same signing key.

### 9.4 Verify the Build

1. Download the `.aab` from the EAS build dashboard
2. Optionally test it locally using `bundletool`:
   ```bash
   # Install bundletool
   brew install bundletool

   # Generate APKs from AAB and install on a connected device
   bundletool build-apks --bundle=unmatch.aab --output=unmatch.apks
   bundletool install-apks --apks=unmatch.apks
   ```
3. Or use **internal testing** (see Step 10) to distribute to real devices via Play Console

---

## Step 10 — Upload to Google Play Console

You have two options:

### Option A: Upload via EAS Submit (recommended)

```bash
pnpm run submit:android
# or directly:
eas submit --platform android --profile production
```

First time, EAS will ask you to provide a **Google Service Account JSON key**. Set this up:

1. Go to **Google Cloud Console** > your project (or create one)
2. Navigate to **IAM & Admin > Service Accounts**
3. Create a service account with a descriptive name (e.g., `eas-submit`)
4. Grant the role **Service Account User**
5. Create a JSON key and download it
6. In **Google Play Console**, go to **Settings > API access**
7. Click **Link** to link your Google Cloud project
8. Find your service account and grant **Release manager** (or **Admin**) permission
9. When EAS prompts, provide the path to your JSON key file

> EAS will remember the key for future submissions.

### Option B: Manual Upload

1. Go to **Google Play Console > your app > Release > Production**
2. Click **Create new release**
3. Upload the `.aab` file you downloaded from EAS
4. Add release notes
5. Save

---

## Step 11 — Testing Tracks (Recommended Before Production)

Google Play has testing tracks to validate your app before full release:

### 11.1 Internal Testing (up to 100 testers)

1. Go to **Release > Testing > Internal testing**
2. Create a release and upload your `.aab`
3. Add testers by email address (they must have Google accounts)
4. Testers receive a link to opt in and install

### 11.2 Closed Testing (limited audience)

- Similar to internal but for a larger group
- Useful for beta testing with real users

### 11.3 Open Testing (public beta)

- Anyone can join the beta via the store listing
- Good for gathering feedback before full launch

> **Recommendation**: Do at least **internal testing** before submitting to production. This catches device-specific issues and gives you confidence in the release pipeline.

---

## Step 12 — Production Release

Once testing is complete:

1. Go to **Release > Production**
2. Click **Create new release**
3. Select the build from your testing track (promote it) or upload a new `.aab`
4. Write **release notes** (shown to users in the "What's new" section):
   ```
   Initial release of Unmatch — your companion for breaking dating app habits.

   - Guided panic button for urge moments
   - Daily check-ins and habit tracking
   - 7-day starter course
   - Progress tracking with streaks
   - Fully offline — your data stays on your device
   ```
5. Click **Review release**
6. Confirm there are no errors or warnings
7. Click **Start rollout to Production**

### Staged Rollout (Optional but Recommended)

- Google allows you to roll out to a percentage of users (e.g., 20%)
- Monitor crash rates and reviews before going to 100%
- You can halt the rollout if issues arise

---

## Step 13 — Review Process

### What to Expect

| Aspect | Details |
|---|---|
| **Review time** | Usually 1–3 days for new apps (can be up to 7 days) |
| **Status updates** | Check under **Publishing overview** in Play Console |
| **Communication** | Google emails you if the app is rejected or needs changes |

### Common Rejection Reasons and How to Avoid Them

| Reason | Prevention |
|---|---|
| **Missing privacy policy** | Host it publicly and link it in Store Listing + Data Safety |
| **Inaccurate data safety** | Double-check every declaration matches your actual data practices |
| **Broken functionality** | Test the production build on a real device before submitting |
| **Misleading description** | Don't claim the app "cures" or "treats" addiction (CLAUDE.md already forbids this) |
| **Insufficient content** | App must feel complete — no placeholder screens or lorem ipsum |
| **Target API level too low** | Google requires targetSdkVersion 34+ (as of 2024). EAS uses the latest by default |
| **Permissions not justified** | Only request permissions you use. Current biometric permissions are justified |
| **Metadata policy violation** | No misleading keywords, no competitor names in description |

---

## Step 14 — Post-Submission

### 14.1 Monitor the Release

- **Android Vitals** (Play Console > Quality > Android Vitals): Monitor ANRs, crashes, excessive wakeups
- **Ratings & Reviews**: Respond promptly to user reviews
- **Pre-launch report**: Google auto-tests your app on Firebase Test Lab devices — check results under **Release > Pre-launch report**

### 14.2 Subsequent Updates

For future releases, the process is simpler:

```bash
# 1. Make your changes, ensure preflight passes
pnpm run preflight

# 2. Build (version auto-increments via eas.json "autoIncrement": true)
pnpm run build:android

# 3. Submit
pnpm run submit:android

# Or do both in one step:
pnpm run ship:android
```

### 14.3 Version Management

Your `eas.json` has `"appVersionSource": "remote"` and `"autoIncrement": true`, so:
- **Version code** (Android's integer build number) auto-increments on each build
- **Version name** (display version like `1.0.0`) is pulled from `app.json` — update `version` there for new releases

---

## Quick Reference — Key Commands

| Action | Command |
|---|---|
| Run preflight checks | `pnpm run preflight` |
| Build Android production AAB | `pnpm run build:android` |
| Submit to Google Play | `pnpm run submit:android` |
| Build + auto-submit | `pnpm run ship:android` |
| Manage Android credentials | `eas credentials --platform android` |
| Check build status | `eas build:list --platform android` |

---

## Checklist Summary

Copy this into your tracking system and check items off as you go:

- [ ] Google Play Developer account created and verified
- [ ] App created in Google Play Console
- [ ] Store listing filled out (descriptions, screenshots, feature graphic)
- [ ] Privacy policy hosted and linked
- [ ] Content rating questionnaire completed
- [ ] Data safety declaration completed
- [ ] Target audience set
- [ ] Ads declaration completed
- [ ] Google Service Account key created for EAS Submit
- [ ] `pnpm run preflight` passes
- [ ] Production build created: `pnpm run build:android`
- [ ] Build tested on a real Android device
- [ ] Build uploaded to internal testing track
- [ ] Internal testing validated
- [ ] Production release created
- [ ] Release notes written
- [ ] Submitted for review
- [ ] Review approved — app is live
