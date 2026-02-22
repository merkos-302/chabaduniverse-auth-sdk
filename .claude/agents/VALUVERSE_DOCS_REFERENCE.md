# Valuverse / Valu Social API — Documentation Reference

**Official Docs:** https://docs.texpo.io/
**SDK GitHub:** https://github.com/Roomful/valu-api
**Sample App:** https://github.com/Roomful/ValuSampleApp

## Documentation Sections (docs.texpo.io)

| Section | URL | What it covers |
|---------|-----|----------------|
| Valu Overview | /valu-overview | Platform overview, app embedding model |
| Valuverse SuperApp API | /valu-api | ValuApi class, Intent class, ValuApplication lifecycle, APIPointer |
| Intents Reference | /intents-doc | All 12 app intents + 3 service intents with params |
| VanillaJS Snippets | /valu-snippets | Routing initialization, postMessage/MutationObserver patterns |
| Valu Routing | /valu-routing | URL routing within the Valu parent app |
| Valuverse Backend | /Valuverse_Backend | Backend server architecture |
| Backend API | /apidocs/Readme | REST API reference |
| Valu Wallet API | https://valu-verse.github.io/valuapi/ | External wallet API |

## Key API Classes

### ValuApi
Main entry point. Accessed via `import valuApi from '@arkeytyp/valu-api'`
- `valuApi.sendIntent(intent)` — Send UI intent to the parent Valu app (async)
- `valuApi.callService(intent)` — Call background service (async)
- `valuApi.getApi(name)` — Get named sub-API (users, network, system)

### Intent
`new Intent(applicationId, action?, params?)`
```typescript
import { Intent } from '@arkeytyp/valu-api';
const intent = new Intent('textchat', 'open-channel', { channelId: 'xyz' });
```

### ValuApplication (class to extend)
Lifecycle: `onCreate(intent)` → `onNewIntent(intent)` (0..N) → `onDestroy()`

### APIPointer (v1.0.x pattern — older)
`valuApi.getAPIPointer('app')` + `.run('open', 'text_chat')` — use Intent system instead for v1.1+

---

## sendIntent vs callService

| Method | Use for | Examples |
|--------|---------|---------|
| `sendIntent(intent)` | UI actions in parent app | chat, video, navigation, preview |
| `callService(intent)` | Background services | ApplicationStorage, Resources, CMS |

---

## All Intents Reference (auto-generated 2026-02-20)

### Application Intents (sendIntent)

| App | Action | Key Params |
|-----|--------|-----------|
| `auth` | `logout` | — |
| `events` | `open-calendar` | — |
| `textchat` | `open-channel` | `channelId` |
| `textchat` | `options` | — |
| `textchat` | `open-room-ai-chat` | — |
| `cms` | `show-chat-channel` | `channelId` |
| `cms` | `show-community-channel` | `channelId` |
| `community` | `create-post` | — |
| `community` | `create-channel` | — |
| `community` | `show-channel` | `channelId` |
| `community` | `show-post` | `postId` |
| `groups` | `open` | `groupId` |
| `contacts` | `show-user` | `userId` |
| `profile` | `openForUser` | `userId` |
| `profile` | `openForUserWithMode` | `userId`, `mode` |
| `preview` | `preview` | `resourceId` (undocumented—confirmed by Valu team) |
| `rooms` | `invite-to-room` | `roomId` |
| `metaverse` | `set-route` | `route` |
| `videochat` | `connect-to-meeting` | `roomId` |

### Service Intents (callService)

| Service | Action | Key Params |
|---------|--------|-----------|
| `ApplicationStorage` | `resource-upload` | `files` (FileList) |
| `ApplicationStorage` | `resource-search` | query params |
| `ApplicationStorage` | `resource-delete` | `resourceId` |
| `CMS` | `resource-upload` | `files` |
| `CMS` | `resource-search` | query params |
| `CMS` | `resource-delete` | `resourceId` |
| `Resources` | `get-thumbnail-url` | `resourceId` |
| `Resources` | `generate-public-url` | `resourceId` |
| `Resources` | `generate-best-view-url` | `resourceId` |
| `Resources` | `generate-direct-public-url` | `resourceId` |

---

## Known API Limitations (confirmed by Valu team)

1. **No video chat close intent** — Can only open videochat with `connect-to-meeting`, cannot close programmatically (confirmed by Stan from Valu, January 2026)
2. **Cross-origin URL reading** — Cannot read parent iframe URL from within embedded app (browser security policy)
3. **React state** — Does not persist across Valu app navigations
4. **`preview` intent** — Undocumented in SDK/docs but confirmed working; falls back to clipboard copy when not in iframe
