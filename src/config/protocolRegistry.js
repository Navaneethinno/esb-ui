/**
 * ESB PROTOCOL REGISTRY
 * 
 * Single source of truth for protocol-aware UI
 * 
 * STATUS: INVENTORY ONLY - DO NOT CONNECT TO RUNTIME
 * PURPOSE: Frontend reference for protocol-specific form fields
 * 
 * Based on: docs/esb-api-payloads.txt analysis
 * Date: 2024
 */

export const PROTOCOL_REGISTRY = {
  
  /**
   * ========================================
   * ISO 8583 - FINANCIAL TRANSACTION PROTOCOL
   * ========================================
   * 
   * Standard: ISO 8583:1987/1993/2003
   * Usage: Card payment networks, ATM transactions, POS systems
   */
  ISO8583: {
    format: "ISO8583",
    displayName: "ISO 8583",
    description: "Financial transaction messaging standard",
    category: "FINANCIAL",
    
    /**
     * Message Type Indicators (MTI)
     * 4-digit code: [Version][Class][Function][Origin]
     */
    supportedMTIs: [
      // Authorization Messages
      { mti: "0100", name: "Authorization Request", direction: "REQUEST", category: "AUTHORIZATION" },
      { mti: "0110", name: "Authorization Response", direction: "RESPONSE", category: "AUTHORIZATION" },
      
      // Financial Messages
      { mti: "0200", name: "Financial Transaction Request", direction: "REQUEST", category: "FINANCIAL" },
      { mti: "0210", name: "Financial Transaction Response", direction: "RESPONSE", category: "FINANCIAL" },
      { mti: "0220", name: "Financial Transaction Advice", direction: "ADVICE", category: "FINANCIAL" },
      { mti: "0230", name: "Financial Transaction Advice Response", direction: "RESPONSE", category: "FINANCIAL" },
      
      // Reversal Messages
      { mti: "0400", name: "Reversal Request", direction: "REQUEST", category: "REVERSAL" },
      { mti: "0410", name: "Reversal Response", direction: "RESPONSE", category: "REVERSAL" },
      { mti: "0420", name: "Reversal Advice", direction: "ADVICE", category: "REVERSAL" },
      { mti: "0430", name: "Reversal Advice Response", direction: "RESPONSE", category: "REVERSAL" },
      
      // Reconciliation Messages
      { mti: "0500", name: "Reconciliation Request", direction: "REQUEST", category: "RECONCILIATION" },
      { mti: "0510", name: "Reconciliation Response", direction: "RESPONSE", category: "RECONCILIATION" },
      
      // Administrative Messages
      { mti: "0800", name: "Network Management Request", direction: "REQUEST", category: "NETWORK" },
      { mti: "0810", name: "Network Management Response", direction: "RESPONSE", category: "NETWORK" },
    ],
    
    /**
     * Data Elements (DE)
     * ISO 8583 bitmap fields
     */
    dataElements: {
      
      // Primary Account Information
      primaryFields: [
        { de: "2", name: "Primary Account Number (PAN)", type: "LLVAR", maxLength: 19, required: true, pciProtection: "MASK" },
        { de: "3", name: "Processing Code", type: "NUMERIC", maxLength: 6, required: true },
        { de: "4", name: "Amount, Transaction", type: "NUMERIC", maxLength: 12, required: true },
        { de: "7", name: "Transmission Date & Time", type: "NUMERIC", maxLength: 10, required: true },
        { de: "11", name: "Systems Trace Audit Number (STAN)", type: "NUMERIC", maxLength: 6, required: true },
        { de: "12", name: "Local Transaction Time", type: "NUMERIC", maxLength: 6, required: true },
        { de: "13", name: "Local Transaction Date", type: "NUMERIC", maxLength: 4, required: true },
        { de: "14", name: "Expiration Date", type: "NUMERIC", maxLength: 4, required: false, pciProtection: "MASK" },
        { de: "22", name: "Point of Service Entry Mode", type: "NUMERIC", maxLength: 3, required: true },
        { de: "23", name: "Card Sequence Number", type: "NUMERIC", maxLength: 3, required: false },
        { de: "25", name: "Point of Service Condition Code", type: "NUMERIC", maxLength: 2, required: true },
        { de: "32", name: "Acquiring Institution ID", type: "LLVAR", maxLength: 11, required: false },
        { de: "35", name: "Track 2 Data", type: "LLVAR", maxLength: 37, required: false, pciProtection: "ENCRYPT" },
        { de: "37", name: "Retrieval Reference Number", type: "ALPHANUMERIC", maxLength: 12, required: true },
        { de: "38", name: "Authorization ID Response", type: "ALPHANUMERIC", maxLength: 6, required: false, responseOnly: true },
        { de: "39", name: "Response Code", type: "ALPHANUMERIC", maxLength: 2, required: false, responseOnly: true },
        { de: "41", name: "Card Acceptor Terminal ID", type: "ALPHANUMERIC", maxLength: 8, required: true },
        { de: "42", name: "Card Acceptor ID Code", type: "ALPHANUMERIC", maxLength: 15, required: true },
        { de: "43", name: "Card Acceptor Name/Location", type: "ALPHANUMERIC", maxLength: 40, required: false },
        { de: "49", name: "Currency Code, Transaction", type: "ALPHANUMERIC", maxLength: 3, required: true },
        { de: "52", name: "PIN Data", type: "BINARY", maxLength: 8, required: false, pciProtection: "ENCRYPT" },
        { de: "54", name: "Additional Amounts", type: "LLLVAR", maxLength: 120, required: false },
        { de: "55", name: "ICC Data (EMV)", type: "LLLVAR", maxLength: 999, required: false },
        { de: "90", name: "Original Data Elements", type: "NUMERIC", maxLength: 42, required: false },
        { de: "95", name: "Replacement Amounts", type: "ALPHANUMERIC", maxLength: 42, required: false },
        { de: "102", name: "Account ID 1", type: "LLVAR", maxLength: 28, required: false },
        { de: "103", name: "Account ID 2", type: "LLVAR", maxLength: 28, required: false },
        { de: "123", name: "Receipt Data", type: "LLLVAR", maxLength: 999, required: false, responseOnly: true },
        { de: "128", name: "Message Authentication Code (MAC)", type: "BINARY", maxLength: 8, required: false },
      ],
      
      // Response-Only Fields
      responseOnlyFields: [
        { de: "38", name: "Authorization ID Response" },
        { de: "39", name: "Response Code" },
        { de: "44", name: "Additional Response Data" },
        { de: "54", name: "Additional Amounts" },
        { de: "123", name: "Receipt Data" },
      ],
      
      // Required Fields by MTI
      requiredByMTI: {
        "0100": ["2", "3", "4", "7", "11", "22", "25", "41", "42", "49"],
        "0110": ["2", "3", "4", "7", "11", "39", "41", "42", "49"],
        "0200": ["2", "3", "4", "7", "11", "12", "13", "22", "25", "41", "42", "49"],
        "0210": ["2", "3", "4", "7", "11", "12", "13", "38", "39", "41", "42", "49"],
        "0400": ["2", "3", "4", "7", "11", "37", "90"],
        "0410": ["2", "3", "4", "7", "11", "37", "39", "90"],
        "0800": ["7", "11", "70"],
        "0810": ["7", "11", "39", "70"],
      },
    },
    
    /**
     * Request Types (Transaction Types)
     */
    requestTypes: [
      { code: "FINANCIAL_PURCHASE", mti: "0200", processingCode: "000000", description: "Purchase transaction" },
      { code: "FINANCIAL_WITHDRAWAL", mti: "0200", processingCode: "010000", description: "Cash withdrawal" },
      { code: "BALANCE_INQUIRY", mti: "0100", processingCode: "300000", description: "Balance inquiry" },
      { code: "FUND_TRANSFER", mti: "0200", processingCode: "400000", description: "Fund transfer" },
      { code: "PAYMENT", mti: "0200", processingCode: "280000", description: "Bill payment" },
      { code: "REVERSAL", mti: "0400", processingCode: "000000", description: "Transaction reversal" },
      { code: "NETWORK_TEST", mti: "0800", processingCode: "990000", description: "Network echo test" },
    ],
    
    /**
     * UI Configuration
     */
    uiConfig: {
      encoding: {
        label: "Encoding Format",
        options: ["ASCII", "EBCDIC", "BCD"],
        default: "ASCII",
      },
      bitmapFormat: {
        label: "Bitmap Format",
        options: ["HEX", "BINARY"],
        default: "HEX",
      },
      lengthEncoding: {
        label: "Length Encoding",
        options: ["ASCII", "BCD"],
        default: "ASCII",
      },
      mtiField: {
        label: "Message Type Indicator (MTI)",
        required: true,
        validation: "^[0-9]{4}$",
      },
      outputFormat: {
        label: "Output Format",
        options: ["ISO8583_BINARY", "ISO8583_ASCII", "JSON"],
        default: "ISO8583_BINARY",
      },
    },
  },
  
  /**
   * ========================================
   * ISO 20022 - UNIVERSAL FINANCIAL MESSAGING
   * ========================================
   * 
   * Standard: ISO 20022
   * Usage: SWIFT, SEPA, cross-border payments, securities
   */
  ISO20022: {
    format: "ISO20022",
    displayName: "ISO 20022",
    description: "Universal financial messaging standard (XML-based)",
    category: "FINANCIAL",
    
    /**
     * Message Families
     * Organized by business area
     */
    messageFamilies: [
      {
        family: "pacs",
        code: "pacs",
        name: "Payments Clearing and Settlement",
        description: "Payment clearing and settlement messages",
        messages: [
          { code: "pacs.008", version: "001.008", name: "FIToFICustomerCreditTransfer", description: "Customer credit transfer" },
          { code: "pacs.009", version: "001.008", name: "FinancialInstitutionCreditTransfer", description: "FI credit transfer" },
          { code: "pacs.002", version: "001.010", name: "PaymentStatusReport", description: "Payment status report", responseOnly: true },
          { code: "pacs.004", version: "001.009", name: "PaymentReturn", description: "Payment return", responseOnly: true },
          { code: "pacs.028", version: "001.003", name: "FIToFIPaymentStatusRequest", description: "Payment status request" },
        ],
      },
      {
        family: "pain",
        code: "pain",
        name: "Payment Initiation",
        description: "Customer-to-bank payment instructions",
        messages: [
          { code: "pain.001", version: "001.009", name: "CustomerCreditTransferInitiation", description: "Credit transfer initiation" },
          { code: "pain.002", version: "001.010", name: "CustomerPaymentStatusReport", description: "Payment status report", responseOnly: true },
          { code: "pain.008", version: "001.008", name: "CustomerDirectDebitInitiation", description: "Direct debit initiation" },
          { code: "pain.013", version: "001.007", name: "CreditorPaymentActivationRequest", description: "Payment activation request" },
        ],
      },
      {
        family: "camt",
        code: "camt",
        name: "Cash Management",
        description: "Account reporting and management",
        messages: [
          { code: "camt.052", version: "001.008", name: "BankToCustomerAccountReport", description: "Account report", responseOnly: true },
          { code: "camt.053", version: "001.008", name: "BankToCustomerStatement", description: "Bank statement", responseOnly: true },
          { code: "camt.054", version: "001.008", name: "BankToCustomerDebitCreditNotification", description: "Debit/credit notification", responseOnly: true },
          { code: "camt.056", version: "001.008", name: "FIToFIPaymentCancellationRequest", description: "Payment cancellation request" },
          { code: "camt.060", version: "001.005", name: "AccountReportingRequest", description: "Account reporting request" },
        ],
      },
      {
        family: "acmt",
        code: "acmt",
        name: "Account Management",
        description: "Account opening and maintenance",
        messages: [
          { code: "acmt.001", version: "001.003", name: "AccountOpeningInstruction", description: "Account opening" },
          { code: "acmt.002", version: "001.003", name: "AccountDetailsConfirmation", description: "Account confirmation", responseOnly: true },
          { code: "acmt.003", version: "001.003", name: "AccountModificationInstruction", description: "Account modification" },
          { code: "acmt.005", version: "001.003", name: "AccountOpeningRequest", description: "Account opening request" },
        ],
      },
      {
        family: "auth",
        code: "auth",
        name: "Authorities",
        description: "Regulatory reporting messages",
        messages: [
          { code: "auth.001", version: "001.001", name: "InformationRequestOpeningV01", description: "Information request" },
          { code: "auth.002", version: "001.001", name: "InformationRequestResponseV01", description: "Information response", responseOnly: true },
        ],
      },
    ],
    
    /**
     * Common Data Elements
     * Core fields across ISO20022 messages
     */
    commonFields: {
      header: [
        { path: "AppHdr/Fr/FIId/FinInstnId/BICFI", name: "Sender BIC", required: true, roundTripSafe: true },
        { path: "AppHdr/To/FIId/FinInstnId/BICFI", name: "Receiver BIC", required: true, roundTripSafe: true },
        { path: "AppHdr/BizMsgIdr", name: "Business Message Identifier", required: true, roundTripSafe: true },
        { path: "AppHdr/MsgDefIdr", name: "Message Definition Identifier", required: true, roundTripSafe: true },
        { path: "AppHdr/CreDt", name: "Creation Date", required: true, roundTripSafe: true },
      ],
      
      groupHeader: [
        { path: "GrpHdr/MsgId", name: "Message ID", required: true, roundTripSafe: true },
        { path: "GrpHdr/CreDtTm", name: "Creation Date Time", required: true, roundTripSafe: true },
        { path: "GrpHdr/NbOfTxs", name: "Number of Transactions", required: true, roundTripSafe: false },
        { path: "GrpHdr/CtrlSum", name: "Control Sum", required: false, roundTripSafe: false },
        { path: "GrpHdr/InitgPty/Nm", name: "Initiating Party Name", required: true, roundTripSafe: true },
      ],
      
      paymentInformation: [
        { path: "PmtInf/PmtInfId", name: "Payment Information ID", required: true, roundTripSafe: true },
        { path: "PmtInf/PmtMtd", name: "Payment Method", required: true, roundTripSafe: true },
        { path: "PmtInf/ReqdExctnDt", name: "Requested Execution Date", required: true, roundTripSafe: true },
        { path: "PmtInf/Dbtr/Nm", name: "Debtor Name", required: true, roundTripSafe: true },
        { path: "PmtInf/DbtrAcct/Id/IBAN", name: "Debtor IBAN", required: true, roundTripSafe: true, pciProtection: "MASK" },
        { path: "PmtInf/DbtrAgt/FinInstnId/BICFI", name: "Debtor Agent BIC", required: true, roundTripSafe: true },
      ],
      
      creditTransferTransaction: [
        { path: "CdtTrfTxInf/PmtId/EndToEndId", name: "End to End ID", required: true, roundTripSafe: true },
        { path: "CdtTrfTxInf/PmtId/TxId", name: "Transaction ID", required: false, roundTripSafe: true },
        { path: "CdtTrfTxInf/Amt/InstdAmt", name: "Instructed Amount", required: true, roundTripSafe: true },
        { path: "CdtTrfTxInf/CdtrAgt/FinInstnId/BICFI", name: "Creditor Agent BIC", required: true, roundTripSafe: true },
        { path: "CdtTrfTxInf/Cdtr/Nm", name: "Creditor Name", required: true, roundTripSafe: true },
        { path: "CdtTrfTxInf/CdtrAcct/Id/IBAN", name: "Creditor IBAN", required: true, roundTripSafe: true, pciProtection: "MASK" },
        { path: "CdtTrfTxInf/RmtInf/Ustrd", name: "Remittance Information", required: false, roundTripSafe: true },
      ],
      
      statusInformation: [
        { path: "OrgnlGrpInf/OrgnlMsgId", name: "Original Message ID", required: true, roundTripSafe: true, responseOnly: true },
        { path: "OrgnlGrpInf/OrgnlMsgNmId", name: "Original Message Name", required: true, roundTripSafe: true, responseOnly: true },
        { path: "TxInfAndSts/StsId", name: "Status ID", required: false, roundTripSafe: true, responseOnly: true },
        { path: "TxInfAndSts/TxSts", name: "Transaction Status", required: true, roundTripSafe: true, responseOnly: true },
        { path: "TxInfAndSts/StsRsnInf/Rsn/Cd", name: "Status Reason Code", required: false, roundTripSafe: true, responseOnly: true },
      ],
    },
    
    /**
     * Request Types
     */
    requestTypes: [
      { code: "CREDIT_TRANSFER", family: "pacs", message: "pacs.008", description: "Customer credit transfer" },
      { code: "PAYMENT_INITIATION", family: "pain", message: "pain.001", description: "Payment initiation" },
      { code: "ACCOUNT_STATEMENT", family: "camt", message: "camt.053", description: "Bank statement" },
      { code: "BALANCE_REPORT", family: "camt", message: "camt.052", description: "Account report" },
      { code: "PAYMENT_STATUS", family: "pacs", message: "pacs.002", description: "Payment status report" },
      { code: "PAYMENT_RETURN", family: "pacs", message: "pacs.004", description: "Payment return" },
      { code: "PAYMENT_CANCELLATION", family: "camt", message: "camt.056", description: "Payment cancellation" },
    ],
    
    /**
     * UI Configuration
     */
    uiConfig: {
      messageFamily: {
        label: "Message Family",
        required: true,
        options: ["pacs", "pain", "camt", "acmt", "auth"],
      },
      messageType: {
        label: "Message Type",
        required: true,
        dependsOn: "messageFamily",
      },
      messageVersion: {
        label: "Message Version",
        required: true,
        default: "001.008",
      },
      namespace: {
        label: "XML Namespace",
        required: false,
        default: "urn:iso:std:iso:20022:tech:xsd",
      },
      validation: {
        label: "Schema Validation",
        type: "checkbox",
        default: true,
      },
      outputFormat: {
        label: "Output Format",
        options: ["ISO20022_XML", "JSON"],
        default: "ISO20022_XML",
      },
    },
    
    /**
     * Round-Trip Safe Fields
     * Fields that can safely be preserved in request/response cycle
     */
    roundTripSafeFields: [
      "AppHdr/Fr/FIId/FinInstnId/BICFI",
      "AppHdr/To/FIId/FinInstnId/BICFI",
      "AppHdr/BizMsgIdr",
      "GrpHdr/MsgId",
      "GrpHdr/CreDtTm",
      "GrpHdr/InitgPty/Nm",
      "PmtInf/PmtInfId",
      "PmtInf/Dbtr/Nm",
      "PmtInf/DbtrAcct/Id/IBAN",
      "CdtTrfTxInf/PmtId/EndToEndId",
      "CdtTrfTxInf/PmtId/TxId",
      "CdtTrfTxInf/Amt/InstdAmt",
      "CdtTrfTxInf/Cdtr/Nm",
      "CdtTrfTxInf/CdtrAcct/Id/IBAN",
    ],
  },
  
  /**
   * ========================================
   * COMMON PROTOCOL UTILITIES
   * ========================================
   */
  utilities: {
    /**
     * Get protocol by format code
     */
    getProtocol(format) {
      const normalized = String(format || "").toUpperCase().replace(/[-_\s]/g, "");
      if (normalized.includes("ISO8583") || normalized === "ISO8583") return this.ISO8583;
      if (normalized.includes("ISO20022") || normalized === "ISO20022") return this.ISO20022;
      return null;
    },
    
    /**
     * Get request types for a protocol
     */
    getRequestTypes(format) {
      const protocol = this.getProtocol(format);
      return protocol?.requestTypes || [];
    },
    
    /**
     * Get UI configuration for a protocol
     */
    getUIConfig(format) {
      const protocol = this.getProtocol(format);
      return protocol?.uiConfig || {};
    },
    
    /**
     * Check if format is a structured protocol
     */
    isStructuredProtocol(format) {
      return ["ISO8583", "ISO20022", "ISO_8583", "ISO_20022"].includes(String(format || "").toUpperCase());
    },
    
    /**
     * Get fields requiring PCI protection
     */
    getPCIProtectedFields(format) {
      const protocol = this.getProtocol(format);
      if (!protocol) return [];
      
      if (format === "ISO8583") {
        return protocol.dataElements.primaryFields
          .filter(de => de.pciProtection)
          .map(de => ({ de: de.de, name: de.name, protection: de.pciProtection }));
      }
      
      if (format === "ISO20022") {
        const fields = [];
        Object.values(protocol.commonFields).forEach(group => {
          group.filter(f => f.pciProtection).forEach(f => {
            fields.push({ path: f.path, name: f.name, protection: f.pciProtection });
          });
        });
        return fields;
      }
      
      return [];
    },
  },
};

/**
 * Export for direct access
 */
export const ISO8583 = PROTOCOL_REGISTRY.ISO8583;
export const ISO20022 = PROTOCOL_REGISTRY.ISO20022;

export default PROTOCOL_REGISTRY;
