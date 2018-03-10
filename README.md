# G2A-PAY API client

This client is a work still in progress.

## Constructor(apiSecret, apiHash, returnUrl, cancelUrl, currency, cartType, sandbox)
- `apiSecret`- Store Api Secret
- `apiHash` - Store API Hash
- `returnUrl`- URL to redirect the payment is successful
- `cancelUrl`- URL to redirect when payment fails
- `currency` - Currency (ISO 4217) `ECurrencyType`
- `cartType` - Cart product type: 'physical' or 'digital'
- `sandbox` - Optional. Set this to `true` to connect the client to the G2A Pay test servers for
 testing your integration 
 
### Methods
##### createSubscriptionOrder(orderId, amount, items, subscription, options)
- `orderId` - Order ID
- `amount` - Order Payment Amount
- `items` - Items array
