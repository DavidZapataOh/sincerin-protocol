# Sincerin Protocol

## 1. Problem Statement

- What real-world problem are you solving?
Private on-chain payments are still traceable and expose sensitive financial activity
- For whom is this a problem (which users, organizations, or communities)?
This affects individuals, institutions, and protocols that need confidentiality
- Why is this problem urgent or important now?
As crypto adoption grows, privacy becomes essential for safety, compliance, and real-world usability

## 2. Target User and User Need

- Who is your **primary user**
Individuals and businesses that require private on-chain payments
- What is their **core need or pain point**?
Transfer value without exposing identities or balances while remaining fully compliant
- How do they currently solve this (workarounds, existing tools, manual processes)?
Mixers or stealth-address tools that offer privacy but break compliance or lack auditability

## 3. Solution Overview

### 3.1 Main Idea

- One paragraph describing your solution in plain language.
We provide a private-payments layer that lets users send and receive value without exposing identities or balances. Users generate a private proof off-chain, submits a minimal on-chain action, and the protocol verifies and settles the payment with confidentiality
- What is the **core user journey** or main use case?
A user initiates a payment → creates a private proof → sends a confidential transfer → the recipient receives funds without revealing either party’s financial history.

### 3.2 Why Stellar?

- How does the **Stellar ecosystem** help you solve this better?
Stellar provides fast, low-cost, globally accessible payments with strong compliance infrastructure, making it ideal for privacy layers that must remain audit-friendly and practical for real-world use.
- Which elements are you planning to use? For example:
  - Stellar network (payments, FX, remittances, anchors, stablecoins)
  Stablecoin payments
  - Soroban smart contracts
  Encode the verification and settlement logic.
  - Wallets or on/off-ramps
  For smooth user experience and fiat connectivity
  - Other Stellar-based tooling or services

## 4. Core Features (Planned for the Hackathon)

List 3–5 features you aim to have by the end of Stellar Hack+.

- Feature 1: Private Payment Flow
Users can send a confidential payment using an off-chain proof + on-chain verification.
Working if: payment settles on-chain and observers cannot link sender/receiver.
- Feature 2: Recipient Claim Mechanism
Recipients can claim funds privately without revealing their identity or balances.
Working if: claim succeeds and remains unlinkable.

For each feature, think about:
- What the user can actually **do**.
- How you will know if the feature is **working**.

## 5. MVP Architecture (Initial Idea)

> This is a **first draft**; it will evolve over the hackathon.

- Frontend: Nextjs
- Backend / Services: express, node, railway
- Smart Contracts: Soroban, noir (zk)
- Data / Storage: SQL

If possible, add a simple diagram (can be a screenshot or link) showing:
- User → Frontend → Backend/API → Soroban/Stellar → Any external services.

## 6. Success Criteria for the Hackathon

By the end of Stellar Hack+, we will consider our MVP successful if:

- [ ] A user can send and receive a fully private payment end-to-end on Stellar
- [ ] We can demonstrate a full flow
- [ ] We can measure or show that transactions are unlinkable

Be as concrete as possible (even if ambitious).

## 7. Team

- Team name: Sincerines
- Members and roles:
  - David Zapata – Smart Contract & ZK Developer
  - Alejandro Soto – Fullstack Developer
  - Tomas del Manzo – Fullstack Developer
  - Lautaro Suarez – Business Development
- Links:
  - Github – https://github.com/DavidZapataOh/sincerin-protocol
  - X - https://x.com/sincerinprotocol