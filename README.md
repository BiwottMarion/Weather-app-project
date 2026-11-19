# OliveSky - Weather Dashboard Learning Project
This is a project that can enable a user to access the weather of different places making it easier to 
arrange your activities of the day and an outfit to wear.

## Features
- Home page with links to the other screens.
- Hash-based navigation: Home, Dashboard, Saved Places and About.
- Demo sign-up, sign-in and sign-out.
- Search a town or city using the Open-Meteo geocoding API.
- Fetch current weather from the Open-Meteo forecast API.
- Loading, connection and API response error messages.
- Save and remove favourite places for the signed-in demo account.
- Each user's saved places are stored under a browser-storage key containing that user's ID.
- One document-level click listener handles dynamic buttons.
- Form submission uses `event.preventDefault()` to stop unwanted page reloads.
- User-entered text is escaped before it is inserted into the page.
- Responsive olive green, gold and dark blue design.

## Files
- `index.html` - page structure and shared header/footer.
- `styles.css` - colours, layout, decorative elements and responsive design.
- `script.js` - routing, demo accounts, per-user storage and API calls.

## Testing checklist
- Search for a city that exists.
- Search for a name that does not exist.
- Submit the search form and check that the page does not reload.
- Try the app while offline to see the connection error.
- Sign up with two different demo accounts and save different places to each.
- Sign out and sign in again to check that each account sees only its own saved places.