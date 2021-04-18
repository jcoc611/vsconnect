# Protocols

VSConnect supports multiple *protocols.* A (network) protocol is defines:

 - *What* is sent and received. We call this set of information transmitted a `Transaction`.
 - *How* it is sent and received. We call this a `ProtocolHandler`.

## Transactions
In VSConnect, all transactions share the same interface `ITransaction` regardless of the protocol. This interface includes a few utility fields, such as a unique identifier `id` for every transaction sent/received, and it also has a set of `components`, which are key-value pairs that define the contents of the transaction.

For convenience, we call outgoing transactions "requests" and incoming transactions "responses", regardless of whether incoming transactions are indeed responses to any particular previous request.

Here is a simple example of a HTTP Get request to `https://example.com`

```javascript
{
    id: 0,
    protocolId: "HTTP",
    state: 2, // TransactionState.Sent
    shortStatus: "",
    components: {
        verb: "GET",
        host: "https://example.com",
        path: "",
        tls: { enabled: "true" },
        body: { type: "empty" },
        headers: [
            ["User-Agent", "Mozilla/5.0 (Windows)"],
            ["Content-Length", "auto"]
        ],
        version: "1.1",
        duration: "",
        options: [ ["timeout", "5"] ]
    }
}
```

## Protocol Handlers
Protocol Handlers are responsible for sending transactions over the network, and receiving network messages and transforming them into transactions. The VSConnect client view simply displays incoming transactions and allows editing of outgoing ones.

### Connections
Some protocols are *connection-oriented*. In such cases, the user begins by opening a connection from VSConnect, and subsequent transactions are "tied" to this connection. On the other hand, other protocols are *connectionless*, so requests and responses can occur across multiple (often short-lived) network connections.

For connection-oriented protocols, the user must first initiate a connection. Subsequent requests will take in the identity of such established connection as a parameter.
