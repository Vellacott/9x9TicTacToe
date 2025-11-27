# Firebase Realtime Database Setup Instructions

## Security Rules Configuration

Since you created the database in production mode, you need to set up security rules to allow the game to work.

### Option 1: Simple Rules (Quick Start - Less Secure)

This allows anyone to read/write game data. Good for testing, but not recommended for production with sensitive data.

1. Go to Firebase Console → Your Project
2. Click "Realtime Database" in the left menu
3. Click on the "Rules" tab
4. Replace the existing rules with:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['player1', 'currentPlayer', 'localBoards', 'wonBoards'])"
      }
    }
  }
}
```

5. Click "Publish"

### Option 2: More Secure Rules (Recommended for Production)

This allows read/write access but validates the data structure:

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
        },
        "activeBoard": {
          ".validate": "newData == null || (newData.isNumber() && newData.val() >= 0 && newData.val() <= 8)"
        },
        "localBoards": {
          ".validate": "newData.isArray() && newData.val().length == 9"
        },
        "wonBoards": {
          ".validate": "newData.isArray() && newData.val().length == 9"
        },
        "gameOver": {
          ".validate": "newData.isBoolean()"
        },
        "winner": {
          ".validate": "newData == null || newData.isString()"
        },
        "lastMove": {
          ".validate": "newData == null || (newData.hasChildren(['boardIndex', 'cellIndex']) && newData.child('boardIndex').val() >= 0 && newData.child('boardIndex').val() <= 8 && newData.child('cellIndex').val() >= 0 && newData.child('cellIndex').val() <= 8)"
        },
        "createdAt": {
          ".validate": "newData.isNumber()"
        }
      }
    }
  }
}
```

### Option 3: Time-Based Rules (Auto-cleanup old games)

This adds automatic cleanup of games older than 24 hours:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": "newData.child('createdAt').val() > (now - 86400000) || data.child('createdAt').val() > (now - 86400000)",
        ".validate": "newData.hasChildren(['player1', 'currentPlayer', 'localBoards', 'wonBoards'])"
      }
    }
  }
}
```

## Steps to Apply Rules

1. Open Firebase Console: https://console.firebase.google.com/
2. Select your project: **x9tictactoe**
3. Click **Realtime Database** in the left sidebar
4. Click the **Rules** tab at the top
5. Copy and paste one of the rule sets above (Option 1 is simplest to start)
6. Click **Publish** button
7. You should see a success message

## Verify Database URL

Make sure your database URL in the HTML matches your actual database URL:
- Go to Realtime Database → Data tab
- The URL should be visible at the top
- It should be: `https://x9tictactoe-default-rtdb.firebaseio.com/` or similar
- Update the `databaseURL` in `index.html` if it's different

## Testing

After setting up the rules:
1. Try creating a game - you should see a Game ID
2. Try joining with that Game ID from another browser/device
3. Make a move - it should sync in real-time

If you get permission errors, double-check:
- The rules were published successfully
- The database URL in the code matches your actual database URL
- You're using the correct project

