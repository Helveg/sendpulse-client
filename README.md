![Node.js Package](https://github.com/sendpulse/sendpulse-rest-api-node.js/workflows/Node.js%20Package/badge.svg?event=release)

# SendPulse.js

A SendPulse REST API client compatible with Node.js and browsers.

This package supports all the operations documented in the [SendPulse API Documentation](https://sendpulse.com/api).

### Install

Available for TypeScript, ESM, and CommonJS.

```
npm install sendpulse-client
```

### Usage

#### ESM/TypeScript

```typescript
import { SendPulseClient } from "sendpulse-client";

const client = new SendPulseClient("your-client-id", "your-client-secret");

console.log(await client.listAddressBooks());
```

#### CommonJS

```javascript
const SendPulseClient = require("sendpulse-client");

new SendPulseClient("your-client-id", "your-client-secret").then(addressBooks => {
    console.log(addressBooks);
})
```
