
/**
 * SHA-256
 */
export async function sha256(data: string): Promise<string> {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
        // Browser
        const buf = new TextEncoder().encode(data);
        const hashBuf = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(hashBuf))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
    } else {
        // Node
        const { createHash } = await import("crypto");
        return createHash("sha256").update(data).digest("hex");
    }
}

/**
 * Base64
 */
export function base64(data: string): string {
    if (typeof window !== "undefined") {
        // Browser
        const bytes = new TextEncoder().encode(data);
        let binary = "";
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    } else {
        // Node
        return Buffer.from(data, "utf-8").toString("base64");
    }
}

/**
 * Serializing of the array
 */
export function serializeArray(params: Record<string, any>, prefix?: string): Record<string, any> {
    const result: Record<string, any> = {};

for (const key in params) {
    if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
    const value = params[key];
    let name = key;
    if (prefix !== undefined) {
        name = prefix + '[' + name + ']';
    }
    if (typeof value === 'object' && !(value instanceof Date)) {
        Object.assign(result, serializeArray(value, name));
    } else {
        result[name] = value;
    }
}

return result;
}