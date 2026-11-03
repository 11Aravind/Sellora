# Production Launch & Go-Live Guide

This document outlines the mandatory operational, legal, financial, and technical steps required before welcoming public merchants and processing live transactions.

---

## 1. Go-Live Master Checklist

```
[ ] 1. Domain & SSL: Wildcard *.yourapp.in and root apex resolving with valid SSL.
[ ] 2. Database & RLS: All migrations pushed, seed executed, super admin activated.
[ ] 3. Payment Gateway: Razorpay Live keys active, live plans created, webhook signature verified.
[ ] 4. Email Delivery: Custom SMTP connected, SPF/DKIM/DMARC records verified.
[ ] 5. Push Notifications: Firebase Service Worker functional, VAPID key active.
[ ] 6. Legal & Compliance: Terms, Privacy, and Refund policies published.
[ ] 7. Invoicing & GST: Indian tax rules (SAC 998315) and invoice templates configured.
[ ] 8. Support Channel: Dedicated support email and ticket workflow operational.
[ ] 9. Status Page: Public uptime monitor and incident communication channel live.
[ ] 10. Smoke Test: Real INR transaction executed and verified.
[ ] 11. Rollback Procedure: Documented and rehearsed.
```

---

## 2. Indian Invoicing & GST Requirements (SaaS Subscriptions)

When billing Indian vendors for platform subscription fees, adherence to Indian Goods & Services Tax (GST) rules is required:

### 2.1 SAC Classification & Tax Rates
- **Service Accounting Code (SAC)**: `998315` (Hosting and IT infrastructure provision services / SaaS).
- **Tax Rate**: 18% GST standard rate for SaaS software subscriptions.
  - **Intra-State Supply** (Vendor in the same state as your registered entity): 9% CGST + 9% SGST.
  - **Inter-State Supply** (Vendor in a different Indian state): 18% IGST.
  - **Export of Services** (Vendors outside India paying in foreign convertible currency): Zero-rated under Letter of Undertaking (LUT).

### 2.2 Mandatory Tax Invoice Fields
Every tax invoice generated for subscription billing must contain:
1. **Supplier Details**: Legal registered entity name, registered address, and GSTIN.
2. **Customer Details**:
   - For B2B: Registered legal name, billing address, and vendor GSTIN.
   - For B2C / Unregistered: Vendor name, billing address, and State / State Code.
3. **Invoice Identifier**: Consecutive serial number unique for the financial year (e.g. `INV/2026-27/0001`).
4. **Dates**: Date of issuance and date of supply.
5. **Place of Supply (POS)**: Name and state code of the recipient's location.
6. **Description of Services**: "SaaS Commerce Kit Subscription Plan - [Plan Name]".
7. **Breakdown**: Taxable amount, SAC Code (`998315`), CGST/SGST or IGST rates & amounts, total gross amount in INR.
8. **Digital Signature / Authorization**: Authorized signatory name and designation.

---

## 3. Real Payment Smoke Test Protocol

Before opening signups to the public:
1. Create a hidden or test subscription plan in `/super-admin/plans` priced at **₹1.00** (or ₹5.00, the minimum supported by Razorpay).
2. Register a new vendor account using a real personal email.
3. Subscribe to the plan using a real Indian debit/credit card or UPI handle.
4. Verify:
   - Razorpay Live Checkout modal opens and processes the payment.
   - Customer is debited ₹1-₹5.
   - Razorpay webhook fires to `/api/webhooks/razorpay` with a 200 OK response.
   - Database `subscriptions` table updates to `status = 'active'`.
   - Store access is unlocked without restrictions.
5. Refund the test charge from the Razorpay Live Dashboard.

---

## 4. Checkout Load Testing

Storefront checkout involves transactional database operations with row locks (`place_order`). Run synthetic load tests to evaluate capacity:

### 4.1 Tool: Autocannon or k6
Example test with `autocannon` against store catalog:
```bash
# Test storefront catalog throughput (50 concurrent connections for 30s)
npx autocannon -c 50 -d 30 https://demo.yourapp.in
```

### 4.2 Checkout RPC Concurrency Test (k6)
Ensure your Supabase connection pooler (Transaction mode on port 6543 / Supavisor) is utilized for high concurrency:
- Max database connections recommended: Min 20-50 pool connections for high burst traffic.
- Verify that out-of-stock items reject concurrent transactions cleanly without negative inventory.

---

## 5. Support & Status Communication

1. **Support Inbox**: Setup `support@yourapp.in` (via Google Workspace, Zoho Mail, or HelpScout).
2. **Grievance Officer**: As mandated under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, designate a Grievance Officer with an email and physical contact address on your contact page.
3. **Public Status Page**: Configure a free status page at [Better Stack](https://betterstack.com) or [Instatus](https://instatus.com) pointed at `status.yourapp.in`.

---

## 6. Rollback & Disaster Plan

If a breaking defect or critical data corruption occurs post-launch:

### 6.1 Instant Frontend / API Rollback (Vercel)
1. Navigate to **Vercel Dashboard > Deployments**.
2. Locate the previous stable production deployment.
3. Click the three dots menu `...` and select **Instant Rollback**.
4. Traffic is rerouted in under 5 seconds without a rebuild.

### 6.2 Database Migration Rollback (Supabase)
1. Write the corresponding reverse migration file or use a transaction rollback if uncommitted.
2. If schema corruption occurred, restore using Supabase Point-in-Time Recovery (PITR) to a timestamp 5 minutes prior to the deployment incident.
3. To temporarily suspend vendor transactions during remediation, enable Maintenance Mode in your middleware or DNS redirect.

---

## 7. Legal Policy Templates

Place the finalized policies on public marketing routes (e.g. `/terms`, `/privacy`, `/refund-policy`).

### 7.1 Terms of Service Template

```markdown
# Terms of Service

**Last Updated: [TODO: Date, e.g. November 3, 2026]**

These Terms of Service ("Terms") govern your access to and use of the services provided by **[TODO: Legal Entity Name]** ("Company", "we", "us", or "our"), including our website at **[TODO: yourapp.in]** and any related web platforms, APIs, and multi-tenant e-commerce services (collectively, the "Platform").

#### 1. Account Eligibility and Registration
- You must be at least 18 years of age or a registered legal business entity to create an account.
- You agree to provide accurate, current, and complete information during registration.
- You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your store.

#### 2. Vendor Responsibilities & Acceptable Use
- Merchants ("Vendors") operating stores on the Platform are solely responsible for the products, pricing, fulfillment, and customer service provided to their buyers.
- Prohibited products include, but are not limited to: illegal goods, counterfeit items, narcotics, weapons, offensive materials, and items that violate Indian laws or intellectual property rights.
- Vendors must comply with the Consumer Protection (E-Commerce) Rules, 2020 and applicable Indian laws.

#### 3. Subscription Fees and Payments
- Platform access is billed on a recurring subscription basis as described on our pricing page.
- All subscription fees are exclusive of applicable Indian GST (18%), which will be charged in addition to the base fee.
- Failure to renew subscription fees within the grace period may result in store suspension.

#### 4. Limitation of Liability
- To the maximum extent permitted by applicable law, the Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill.
- The Platform is provided on an "AS IS" and "AS AVAILABLE" basis.

#### 5. Governing Law and Dispute Resolution
- These Terms shall be governed by and construed in accordance with the laws of India.
- Any disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the courts located in **[TODO: City, e.g., Bengaluru, Karnataka]**, India.

#### 6. Grievance Officer
In accordance with the Information Technology Act 2000 and rules made thereunder:
- **Name**: [TODO: Name of Grievance Officer]
- **Designation**: Grievance Redressal Officer
- **Email**: [TODO: grievance@yourapp.in]
- **Address**: [TODO: Physical Registered Office Address]
```

---

### 7.2 Privacy Policy Template

```markdown
# Privacy Policy

**Last Updated: [TODO: Date, e.g. November 3, 2026]**

**[TODO: Legal Entity Name]** ("Company", "we", "our") is committed to protecting your privacy. This Privacy Policy describes how we collect, use, and share information when you use our multi-tenant SaaS e-commerce platform.

#### 1. Information We Collect
- **Vendor Information**: Name, business name, GSTIN, billing address, email address, phone number, and subscription payment details.
- **End-Customer Data**: When customers place orders on vendor stores, we process customer shipping addresses, email addresses, phone numbers, and order contents on behalf of the vendor.
- **Technical Data**: IP addresses, browser types, device identifiers, and usage logs.

#### 2. Purpose of Processing
We use collected data to:
- Provision and maintain merchant stores and multi-tenant routing.
- Process subscription billing via Razorpay.
- Send real-time order notifications and service updates via Firebase Cloud Messaging and transactional email.
- Ensure security, prevent fraudulent activity, and comply with statutory legal requirements.

#### 3. Data Protection & Tenancy Isolation
- Merchant customer data is segregated logically using PostgreSQL Row-Level Security (RLS). No merchant can access another merchant's catalog, orders, or customer records.
- We do not sell merchant data or end-customer data to third parties.

#### 4. Third-Party Service Providers
We share data with trusted sub-processors strictly to deliver platform capabilities:
- **Supabase / AWS**: Database, authentication, and secure cloud storage.
- **Vercel**: Edge routing, compute, and static hosting.
- **Razorpay**: Payment processing and billing.
- **Google Firebase**: Web push notification delivery.

#### 5. User Rights & Data Retention
- Vendors may review, export, or request deletion of their account and store data by contacting support.
- We retain order and financial transaction data for the statutory period required under Indian taxation laws.

#### 6. Contact Information
For privacy questions or data requests:
- **Email**: [TODO: privacy@yourapp.in]
- **Address**: [TODO: Physical Registered Office Address]
```

---

### 7.3 Refund and Cancellation Policy Template

```markdown
# Refund and Cancellation Policy

**Last Updated: [TODO: Date, e.g. November 3, 2026]**

This Refund and Cancellation Policy applies to vendor subscriptions for **[TODO: Legal Entity Name]** ("Company").

#### 1. Vendor Subscription Cancellation
- Vendors may cancel their recurring SaaS subscription at any time via the billing dashboard at `https://yourapp.in/dashboard/settings`.
- Upon cancellation, your subscription remains active until the end of the current paid billing cycle. No further automatic renewals will be charged.

#### 2. Subscription Refunds
- **Initial Purchases**: We offer a **[TODO: 7-day / 14-day]** money-back guarantee for first-time paid subscriptions. If you are unsatisfied, contact `support@yourapp.in` within the guarantee window for a full refund.
- **Recurring Renewals**: Recurring subscription fees are non-refundable once billed. Vendors are responsible for cancelling prior to their billing anniversary.

#### 3. Store End-Customer Refunds (Vendor Products)
- Each merchant operating on our platform sets their own refund, cancellation, and exchange policies for physical products sold through their store.
- **[TODO: Legal Entity Name]** is the technology platform provider and is **not** responsible for disputes or refunds between vendors and their retail customers. Buyers must contact the specific store owner directly.

#### 4. Refund Processing
- Approved subscription refunds are processed to the original payment method via Razorpay within 5–7 business days.

