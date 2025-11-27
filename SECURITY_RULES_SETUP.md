# 🔒 Firebase Security Rules Setup - IMPORTANT

## The Problem
You're getting `permission_denied` errors because Firebase Realtime Database requires security rules to allow read/write access.

## Quick Fix (3 Steps)

### Step 1: Get Your Database URL
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **x9tictactoe**
3. Click **Realtime Database** in left sidebar
4. Click **Data** tab
5. Look at the top - you'll see your database URL (e.g., `https://x9tictactoe-default-rtdb.firebaseio.com/`)
6. **Copy this URL** - you'll need it for Step 3

### Step 2: Set Up Security Rules
1. Still in Firebase Console → Realtime Database
2. Click **Rules** tab (next to Data tab)
3. **Delete everything** in the rules editor
4. **Paste this**:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

5. Click **Publish** button (top right)
6. Wait for "Rules published successfully" message

### Step 3: Update Database URL in Code
1. Open `index.html` in your project
2. Find the `firebaseConfig` object (around line 99)
3. Update the `databaseURL` to match the URL you copied in Step 1
4. Save the file
5. Refresh your browser

## Verify It Works
1. Try creating a game - you should see a Game ID
2. Check Firebase Console → Realtime Database → Data tab
3. You should see a `games` folder with your game ID inside

## If Still Not Working

### Check 1: Rules Format
Make sure your rules look EXACTLY like this (no extra commas, proper JSON):
```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Check 2: Database URL Format
- Should start with `https://`
- Should end with `.firebaseio.com/` or `.firebasedatabase.app/`
- Example: `https://x9tictactoe-default-rtdb.firebaseio.com/`

### Check 3: Rules Were Published
- Go to Rules tab
- Make sure you see the rules you just pasted
- If you see old rules, delete them and paste again

### Check 4: Browser Console
- Open browser console (F12)
- Look for any other errors
- The error should change from `permission_denied` to something else if rules are working

## More Secure Rules (Optional - For Later)

Once it's working, you can use more secure rules:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true,
        "player1": {
          ".validate": "newData.hasChildren(['id', 'player', 'connected'])"
        },
        "player2": {
          ".validate": "newData == null || newData.hasChildren(['id', 'player', 'connected'])"
        },
        "currentPlayer": {
          ".validate": "newData.isString() && (newData.val() == 'X' || newData.val() == 'O')"
        }
      }
    }
  }
}
```

But start with the simple rules above to get it working first!

