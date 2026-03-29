// Temporary script - generates regulated legal HTML pages
// Run: node write_legal.js   then delete this file
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'client', 'public');

const CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; background: #06090f; color: #c8d6e5; line-height: 1.7; font-size: 15px; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    header { position: sticky; top: 0; z-index: 50; background: #08111c; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 24px; }
    .header-inner { max-width: 960px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 60px; }
    .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .logo-icon { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, #0ea5e9, #0369a1); display: flex; align-items: center; justify-content: center; }
    .logo-icon svg { width: 16px; height: 16px; stroke: white; }
    .logo-text { font-weight: 700; font-size: 15px; color: #fff; }
    .logo-text span { color: #38bdf8; }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; color: #6b8099; font-size: 13px; font-weight: 500; padding: 7px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
    .back-btn:hover { color: #fff; text-decoration: none; }
    .hero { background: linear-gradient(180deg, #0b1728 0%, #06090f 100%); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 64px 24px 48px; text-align: center; }
    .badge { display: inline-flex; align-items: center; background: rgba(14,165,233,.1); border: 1px solid rgba(14,165,233,.22); color: #38bdf8; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 4px 12px; border-radius: 99px; margin-bottom: 18px; }
    .hero h1 { font-size: clamp(28px, 5vw, 42px); font-weight: 800; color: #fff; margin-bottom: 12px; }
    .hero p { color: #6b8099; font-size: 15px; }
    .hero p strong { color: #c8d6e5; }
    .reg-badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 22px; }
    .reg-badge { display: flex; align-items: center; gap: 8px; padding: 7px 16px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); }
    .reg-badge-text { font-size: 11px; font-weight: 700; color: #c8d6e5; }
    .reg-badge-sub { font-size: 9.5px; color: #3a5060; }
    .content { max-width: 960px; margin: 0 auto; padding: 60px 24px 80px; }
    .toc { background: #0c1928; border: 1px solid rgba(14,165,233,.12); border-radius: 14px; padding: 28px 32px; margin-bottom: 52px; }
    .toc h2 { font-size: 13px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 16px; }
    .toc ol, .toc ul { padding-left: 20px; columns: 2; column-gap: 32px; }
    .toc li { margin-bottom: 8px; break-inside: avoid; }
    .toc a { color: #94a3b8; font-size: 14px; }
    .toc a:hover { color: #fff; }
    .section { margin-bottom: 52px; }
    .section h2 { font-size: 21px; font-weight: 700; color: #fff; margin-bottom: 16px; padding-top: 10px; display: flex; align-items: center; gap: 12px; }
    .section-num { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; background: rgba(14,165,233,.12); color: #38bdf8; font-size: 13px; font-weight: 800; }
    .section p { color: #94a3b8; margin-bottom: 14px; font-size: 14.5px; }
    .section ul, .section ol { padding-left: 22px; margin-bottom: 14px; }
    .section li { color: #94a3b8; margin-bottom: 8px; font-size: 14.5px; }
    .section li::marker { color: #38bdf8; }
    .hl { color: #c8d6e5; font-weight: 600; }
    .red { color: #ef4444; font-weight: 600; }
    .warn-box { background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.25); border-radius: 12px; padding: 18px 22px; margin: 20px 0; display: flex; gap: 14px; align-items: flex-start; }
    .warn-box p { color: #d97706; margin: 0; font-size: 14px; line-height: 1.6; }
    .warn-box strong { color: #fbbf24; }
    .info-box { background: rgba(14,165,233,.07); border: 1px solid rgba(14,165,233,.2); border-radius: 12px; padding: 18px 22px; margin: 20px 0; display: flex; gap: 14px; align-items: flex-start; }
    .info-box p { color: #7dd3fc; margin: 0; font-size: 14px; line-height: 1.6; }
    .info-box strong { color: #38bdf8; }
    .green-box { background: rgba(0,200,120,.07); border: 1px solid rgba(0,200,120,.2); border-radius: 12px; padding: 18px 22px; margin: 20px 0; display: flex; gap: 14px; align-items: flex-start; }
    .green-box p { color: #6ee7b7; margin: 0; font-size: 14px; line-height: 1.6; }
    .green-box strong { color: #00c878; }
    footer { border-top: 1px solid rgba(255,255,255,0.06); background: #040710; padding: 32px 24px; }
    .footer-inner { max-width: 960px; margin: 0 auto; }
    .footer-disclaimer { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15); border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; font-size: 12px; line-height: 1.7; color: #92400e; }
    .footer-disclaimer strong { color: #d97706; }
    .footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 20px; margin-bottom: 12px; }
    .footer-links a { color: #6b8099; font-size: 13px; }
    .footer-copy { color: #3a4a60; font-size: 12px; text-align: center; }
`;

const HEADER = `<header>
  <div class="header-inner">
    <a href="/" class="logo">
      <div class="logo-icon"><svg fill="none" viewBox="0 0 24 24" stroke-width="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
      <span class="logo-text">TradeX<span> Pro</span></span>
    </a>
    <a href="/" class="back-btn">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back to Home
    </a>
  </div>
</header>`;

const REG_BADGES = `  <div class="reg-badges">
    <div class="reg-badge"><span>&#x1F1EC;&#x1F1E7;</span><div><div class="reg-badge-text">FCA Regulated</div><div class="reg-badge-sub">FRN 987654</div></div></div>
    <div class="reg-badge"><span>&#x1F1E8;&#x1F1FE;</span><div><div class="reg-badge-text">CySEC Licensed</div><div class="reg-badge-sub">Licence 123/45</div></div></div>
    <div class="reg-badge"><span>&#x1F1E8;&#x1F1FC;</span><div><div class="reg-badge-text">Curacao Licensed</div><div class="reg-badge-sub">0005/GCB</div></div></div>
  </div>`;

const FOOTER = `<footer>
  <div class="footer-inner">
    <div class="footer-disclaimer">
      <strong>Risk Warning:</strong> CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.
      <strong>74% of retail investor accounts lose money when trading CFDs with TradeX Pro.</strong>
      You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.
      TradeX Pro Limited is authorised and regulated by the Financial Conduct Authority (FCA, FRN 987654),
      the Cyprus Securities and Exchange Commission (CySEC, Licence 123/45),
      and holds a financial services licence from the Curacao Gaming Control Board (0005/GCB).
      Registered in England &amp; Wales No. 12345678. Registered office: 22 Bishopsgate, London EC2N 4BQ.
    </div>
    <div class="footer-links">
      <a href="/terms-of-service.html">Terms of Service</a>
      <a href="/privacy-policy.html">Privacy Policy</a>
      <a href="/risk-disclosure.html">Risk Disclosure</a>
      <a href="/cookie-policy.html">Cookie Policy</a>
      <a href="/">Home</a>
    </div>
    <p class="footer-copy">&copy; 2026 TradeX Pro Limited. All rights reserved.</p>
  </div>
</footer>`;

function page(title, badge, heroTitle, heroSub, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - TradeX Pro</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230ea5e9' stroke-width='2.5'><polyline points='22 7 13.5 15.5 8.5 10.5 2 17'/><polyline points='16 7 22 7 22 13'/></svg>" />
  <style>${CSS}</style>
</head>
<body>
${HEADER}
<div class="hero">
  <div class="badge">${badge}</div>
  <h1>${heroTitle}</h1>
  <p>${heroSub}</p>
${REG_BADGES}
</div>
<main class="content">
${body}
</main>
${FOOTER}
</body>
</html>`;
}

// ── TERMS OF SERVICE ─────────────────────────────────────────────────────────
const tos = page(
  'Terms of Service', 'Legal Document', 'Terms of Service',
  'Last updated: <strong>28 March 2026</strong> &nbsp;&middot;&nbsp; Effective: <strong>1 January 2026</strong>',
  `<div class="warn-box"><span style="font-size:20px;flex-shrink:0">&#x26A0;&#xFE0F;</span><p><strong>Risk Warning:</strong> CFDs involve significant risk. <strong>74% of retail investor accounts lose money when trading CFDs with TradeX Pro.</strong> Only trade with money you can afford to lose.</p></div>
<nav class="toc"><h2>Table of Contents</h2><ol>
<li><a href="#s1">Acceptance of Terms</a></li><li><a href="#s2">About TradeX Pro</a></li>
<li><a href="#s3">Eligibility &amp; Registration</a></li><li><a href="#s4">Account Types</a></li>
<li><a href="#s5">Financial Products</a></li><li><a href="#s6">Deposits &amp; Withdrawals</a></li>
<li><a href="#s7">Order Execution</a></li><li><a href="#s8">Leverage &amp; Margin</a></li>
<li><a href="#s9">Fees &amp; Charges</a></li><li><a href="#s10">Prohibited Conduct</a></li>
<li><a href="#s11">Intellectual Property</a></li><li><a href="#s12">Limitation of Liability</a></li>
<li><a href="#s13">Complaints</a></li><li><a href="#s14">Governing Law</a></li>
<li><a href="#s15">Amendments</a></li><li><a href="#s16">Contact Us</a></li>
</ol></nav>

<div id="s1" class="section"><h2><span class="section-num">01</span> Acceptance of Terms</h2>
<p>By accessing or using the TradeX Pro platform (the &ldquo;Platform&rdquo;), you (&ldquo;Client&rdquo;, &ldquo;you&rdquo;) agree to be legally bound by these Terms of Service, our Privacy Policy, Risk Disclosure Statement, Cookie Policy, and any other policies published on the Platform. If you do not agree, you must not use the Platform.</p>
<p>These Terms constitute a legally binding agreement between you and TradeX Pro Limited (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). Your continued use of the Platform following any amendment constitutes acceptance of such amendment.</p></div>

<div id="s2" class="section"><h2><span class="section-num">02</span> About TradeX Pro</h2>
<p>TradeX Pro Limited is a financial services company authorised and regulated by the <span class="hl">Financial Conduct Authority (FCA)</span> in the United Kingdom (FRN: 987654), the <span class="hl">Cyprus Securities and Exchange Commission (CySEC)</span> (Licence No. 123/45), and holds a financial services licence issued by the <span class="hl">Curacao Gaming Control Board</span> (Licence No. 0005/GCB).</p>
<p>Incorporated in England and Wales (Co. No. 12345678). Registered office: 22 Bishopsgate, London, EC2N 4BQ, United Kingdom.</p></div>

<div id="s3" class="section"><h2><span class="section-num">03</span> Eligibility &amp; Account Registration</h2>
<p>To open an account you must: be at least 18 years old; not reside in a jurisdiction where CFD trading is prohibited; pass our KYC identity verification; provide accurate and complete information; not be a US Person under applicable US regulations.</p>
<p>You are solely responsible for maintaining the confidentiality of your credentials. Notify us immediately at <a href="mailto:compliance@tradexpro.com">compliance@tradexpro.com</a> if you suspect unauthorised access.</p></div>

<div id="s4" class="section"><h2><span class="section-num">04</span> Account Types (Real &amp; Demo)</h2>
<p><span class="hl">Real Account:</span> Live trading with actual capital. Client funds are held in fully segregated accounts at tier-1 banks, separate from Company operational funds in accordance with FCA and CySEC client money rules.</p>
<p><span class="hl">Demo Account:</span> Practice account with virtual capital ($100,000 or equivalent in EUR/GBP). Uses real-time market data. No real money at risk. Virtual profits have no monetary value and cannot be withdrawn.</p>
<div class="info-box"><span style="font-size:20px;flex-shrink:0">&#x2139;&#xFE0F;</span><p>Demo conditions may differ from live trading. <strong>Demo performance is not indicative of real account performance.</strong></p></div></div>

<div id="s5" class="section"><h2><span class="section-num">05</span> Financial Products</h2>
<p>We offer Contracts for Difference (CFDs) on: Cryptocurrencies (BTC, ETH, and 15+ assets); Forex (40+ currency pairs); Equities (CFDs on major listed companies); Commodities (Gold, Silver, Oil); Indices (S&amp;P 500, NASDAQ 100, FTSE 100, DAX 40).</p>
<p class="red">74% of retail investor accounts lose money when trading CFDs with TradeX Pro. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.</p></div>

<div id="s6" class="section"><h2><span class="section-num">06</span> Deposits, Withdrawals &amp; Client Funds</h2>
<p>Client funds are held in segregated accounts at tier-1 regulated banks. Deposits accepted via bank transfer, debit/credit cards, and approved e-payment methods. Withdrawals processed within 1&ndash;3 business days, subject to AML verification, returned to the original deposit method where possible (return-to-source policy).</p>
<div class="warn-box"><span style="font-size:20px;flex-shrink:0">&#x26A0;&#xFE0F;</span><p><strong>Negative Balance Protection:</strong> Retail client accounts cannot go below zero under FCA and CySEC rules.</p></div></div>

<div id="s7" class="section"><h2><span class="section-num">07</span> Order Execution Policy</h2>
<p>All orders are executed on a best execution basis in accordance with our Order Execution Policy. We may act as principal and take the other side of your trades. Slippage may occur during volatile markets. We reserve the right to reject orders placed erroneously or in breach of these Terms.</p></div>

<div id="s8" class="section"><h2><span class="section-num">08</span> Leverage &amp; Margin Requirements</h2>
<p>Retail client maximum leverage (FCA/ESMA compliant): Major Forex: 30:1 &bull; Minor Forex &amp; Gold: 20:1 &bull; Equity indices: 20:1 &bull; Individual equities: 5:1 &bull; Cryptocurrencies: 2:1. If margin falls below the maintenance level, positions may be closed without prior notice.</p></div>

<div id="s9" class="section"><h2><span class="section-num">09</span> Fees &amp; Charges</h2>
<p>We charge via spread. Additional fees: overnight financing (swap rates), currency conversion, inactivity fee ($10/month after 90 days inactive), and payment processing fees on certain withdrawal methods. Full fee schedule available in the Client Portal. Fee changes notified 30 days in advance.</p></div>

<div id="s10" class="section"><h2><span class="section-num">10</span> Prohibited Conduct</h2>
<ul>
<li>Using the Platform for unlawful purposes or in violation of applicable regulations</li>
<li>Market manipulation, wash trading, or exploiting pricing errors or latency</li>
<li>Using unauthorised automated trading tools, scrapers, or bots</li>
<li>Sharing account credentials or allowing unauthorised third-party access</li>
<li>Money laundering, terrorist financing, or tax evasion</li>
<li>Reverse engineering, decompiling, or interfering with Platform infrastructure</li>
</ul>
<p>Breaches may result in immediate account suspension, trade cancellation, and referral to regulatory or law enforcement authorities.</p></div>

<div id="s11" class="section"><h2><span class="section-num">11</span> Intellectual Property</h2>
<p>All Platform content, algorithms, interfaces, and data compilations are the exclusive property of TradeX Pro Limited or its licensors. Market data is licensed from Binance, Twelve Data, and CoinGecko. You are granted a limited, non-exclusive, non-transferable licence to use the Platform for personal trading purposes only.</p></div>

<div id="s12" class="section"><h2><span class="section-num">12</span> Limitation of Liability</h2>
<p>To the maximum extent permitted by law, TradeX Pro shall not be liable for: trading losses; indirect or consequential damages; service interruptions; data inaccuracies. Nothing excludes liability for negligence causing death or personal injury, fraud, or obligations that cannot be excluded under FSMA 2000.</p></div>

<div id="s13" class="section"><h2><span class="section-num">13</span> Complaints Procedure</h2>
<p>Email: <a href="mailto:complaints@tradexpro.com">complaints@tradexpro.com</a> &bull; Post: Complaints Dept, 22 Bishopsgate, London EC2N 4BQ. We acknowledge within 5 business days; final response within 8 weeks. Unresolved complaints may be escalated to the <a href="https://www.financial-ombudsman.org.uk" target="_blank" rel="noreferrer">Financial Ombudsman Service</a> or Cyprus Financial Ombudsman.</p></div>

<div id="s14" class="section"><h2><span class="section-num">14</span> Governing Law</h2>
<p>These Terms are governed by the laws of England and Wales. Disputes are subject to the exclusive jurisdiction of the English Courts, without prejudice to your right to bring proceedings in local courts where required by mandatory law.</p></div>

<div id="s15" class="section"><h2><span class="section-num">15</span> Amendments</h2>
<p>We may amend these Terms at any time. Material changes will be notified by email or Platform notice at least 30 days in advance. Continued use after the effective date constitutes acceptance.</p></div>

<div id="s16" class="section"><h2><span class="section-num">16</span> Contact Us</h2>
<ul>
<li>Support: <a href="mailto:support@tradexpro.com">support@tradexpro.com</a></li>
<li>Compliance: <a href="mailto:compliance@tradexpro.com">compliance@tradexpro.com</a></li>
<li>Data Protection Officer: <a href="mailto:dpo@tradexpro.com">dpo@tradexpro.com</a></li>
<li>Address: 22 Bishopsgate, London, EC2N 4BQ, UK</li>
</ul></div>`
);

// ── PRIVACY POLICY ──────────────────────────────────────────────────────────
const privacy = page(
  'Privacy Policy', 'Data Protection', 'Privacy Policy',
  'Last updated: <strong>28 March 2026</strong> &nbsp;&middot;&nbsp; GDPR &amp; UK GDPR Compliant',
  `<div class="green-box"><span style="font-size:20px;flex-shrink:0">&#x1F512;</span><p><strong>Your Privacy Matters:</strong> TradeX Pro is fully compliant with the UK General Data Protection Regulation (UK GDPR), the EU General Data Protection Regulation (EU GDPR 2016/679), and the Data Protection Act 2018. Our Data Protection Officer can be contacted at <strong><a href="mailto:dpo@tradexpro.com" style="color:#00c878">dpo@tradexpro.com</a></strong>.</p></div>
<nav class="toc"><h2>Table of Contents</h2><ul>
<li><a href="#p1">Who We Are</a></li><li><a href="#p2">Data We Collect</a></li>
<li><a href="#p3">How We Use Your Data</a></li><li><a href="#p4">Legal Basis for Processing</a></li>
<li><a href="#p5">Data Sharing</a></li><li><a href="#p6">International Transfers</a></li>
<li><a href="#p7">Data Retention</a></li><li><a href="#p8">Your Rights</a></li>
<li><a href="#p9">Cookies</a></li><li><a href="#p10">Children</a></li>
<li><a href="#p11">Changes to Policy</a></li><li><a href="#p12">Contact &amp; Complaints</a></li>
</ul></nav>

<div id="p1" class="section"><h2><span class="section-num">01</span> Who We Are</h2>
<p>TradeX Pro Limited (<span class="hl">&ldquo;TradeX Pro&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;</span>) is the data controller for personal data collected through the TradeX Pro platform and website. We are registered with the UK Information Commissioner&rsquo;s Office (ICO) under registration reference ZB123456.</p>
<p>Registered address: 22 Bishopsgate, London, EC2N 4BQ, United Kingdom. Company No. 12345678.</p></div>

<div id="p2" class="section"><h2><span class="section-num">02</span> Data We Collect</h2>
<p>We collect the following categories of personal data:</p>
<ul>
<li><span class="hl">Identity data:</span> Full name, date of birth, nationality, government-issued ID number, passport or driving licence images</li>
<li><span class="hl">Contact data:</span> Email address, phone number, postal address</li>
<li><span class="hl">Financial data:</span> Bank account details, payment card details (tokenised), transaction history, deposit and withdrawal records</li>
<li><span class="hl">Trading data:</span> Order history, position data, P&amp;L records, trading preferences, risk profile</li>
<li><span class="hl">Technical data:</span> IP address, device identifiers, browser type and version, time zone, operating system, access logs</li>
<li><span class="hl">Profile data:</span> Username, account preferences, communication preferences, KYC/AML verification status</li>
<li><span class="hl">Usage data:</span> Platform usage patterns, feature interactions, session data</li>
<li><span class="hl">Communications data:</span> Records of correspondence with our support and compliance teams</li>
</ul></div>

<div id="p3" class="section"><h2><span class="section-num">03</span> How We Use Your Data</h2>
<p>We use your personal data for the following purposes:</p>
<ul>
<li>Opening, maintaining, and managing your trading account</li>
<li>Executing trades and processing deposits and withdrawals</li>
<li>Complying with KYC (Know Your Customer) and AML (Anti-Money Laundering) obligations</li>
<li>Complying with regulatory reporting requirements to the FCA, CySEC, and Curacao GCB</li>
<li>Providing customer support, resolving disputes, and handling complaints</li>
<li>Sending account notifications, security alerts, and service updates</li>
<li>Improving the Platform through analytics and usage research</li>
<li>Detecting, preventing, and investigating fraud and market abuse</li>
<li>Sending marketing communications where you have given consent (you can withdraw at any time)</li>
<li>Complying with tax reporting obligations (e.g., CRS, FATCA)</li>
</ul></div>

<div id="p4" class="section"><h2><span class="section-num">04</span> Legal Basis for Processing</h2>
<p>Under UK/EU GDPR, we rely on the following legal bases:</p>
<ul>
<li><span class="hl">Contract performance:</span> Processing necessary to provide our trading services to you</li>
<li><span class="hl">Legal obligation:</span> Processing required by FCA, CySEC, AML, tax, and other regulatory requirements</li>
<li><span class="hl">Legitimate interests:</span> Fraud prevention, IT security, improving our services, and business analytics</li>
<li><span class="hl">Consent:</span> Marketing communications and non-essential cookies (you may withdraw consent at any time)</li>
</ul></div>

<div id="p5" class="section"><h2><span class="section-num">05</span> Data Sharing</h2>
<p>We may share your personal data with:</p>
<ul>
<li><span class="hl">Regulatory authorities:</span> FCA, CySEC, Curacao GCB, HMRC, and other competent authorities as required by law</li>
<li><span class="hl">Banking &amp; payment partners:</span> For processing deposits, withdrawals, and payment card verification</li>
<li><span class="hl">KYC/AML providers:</span> Identity verification and sanctions screening services (e.g., Onfido, Jumio)</li>
<li><span class="hl">Technology providers:</span> Supabase (database &amp; authentication), cloud hosting providers operating under data processing agreements</li>
<li><span class="hl">Market data providers:</span> Binance, Twelve Data, CoinGecko (limited non-personal data)</li>
<li><span class="hl">Professional advisors:</span> Lawyers, auditors, and accountants under confidentiality obligations</li>
<li><span class="hl">Law enforcement:</span> Where required by court order or applicable law</li>
</ul>
<p>We do not sell your personal data to third parties for marketing purposes.</p></div>

<div id="p6" class="section"><h2><span class="section-num">06</span> International Data Transfers</h2>
<p>Some of our service providers are located outside the UK/EEA. Where we transfer personal data internationally, we ensure appropriate safeguards are in place, including: Standard Contractual Clauses (SCCs) approved by the European Commission; the UK International Data Transfer Agreement (IDTA); or transfer to countries with an adequacy decision.</p></div>

<div id="p7" class="section"><h2><span class="section-num">07</span> Data Retention</h2>
<p>We retain personal data for as long as necessary to fulfil the purposes for which it was collected, including regulatory requirements:</p>
<ul>
<li>Client account data: 7 years after account closure (FCA requirements)</li>
<li>Transaction records: 7 years (AML/HMRC requirements)</li>
<li>KYC documents: 5 years after the end of the business relationship</li>
<li>Support correspondence: 3 years from date of communication</li>
<li>Marketing preferences: Until consent is withdrawn</li>
</ul></div>

<div id="p8" class="section"><h2><span class="section-num">08</span> Your Rights</h2>
<p>Under UK/EU GDPR, you have the following rights:</p>
<ul>
<li><span class="hl">Right of access:</span> Request a copy of the personal data we hold about you (Subject Access Request)</li>
<li><span class="hl">Right to rectification:</span> Request correction of inaccurate or incomplete personal data</li>
<li><span class="hl">Right to erasure:</span> Request deletion of your personal data (subject to legal retention obligations)</li>
<li><span class="hl">Right to restrict processing:</span> Request limitation of how we use your data in certain circumstances</li>
<li><span class="hl">Right to data portability:</span> Receive your personal data in a structured, machine-readable format</li>
<li><span class="hl">Right to object:</span> Object to processing based on legitimate interests or for direct marketing</li>
<li><span class="hl">Rights related to automated decision-making:</span> Not to be subject solely to automated decisions with significant effects on you</li>
</ul>
<p>To exercise any of these rights, contact our DPO at <a href="mailto:dpo@tradexpro.com">dpo@tradexpro.com</a>. We will respond within 30 days. If you are not satisfied, you have the right to lodge a complaint with the ICO at <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.</p></div>

<div id="p9" class="section"><h2><span class="section-num">09</span> Cookies &amp; Tracking</h2>
<p>We use cookies and similar tracking technologies. Please see our full <a href="/cookie-policy.html">Cookie Policy</a> for details. You can manage your cookie preferences at any time through our cookie consent manager or your browser settings.</p></div>

<div id="p10" class="section"><h2><span class="section-num">10</span> Children&rsquo;s Privacy</h2>
<p>Our Platform is not directed to persons under the age of 18. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately at <a href="mailto:dpo@tradexpro.com">dpo@tradexpro.com</a> and we will delete such data promptly.</p></div>

<div id="p11" class="section"><h2><span class="section-num">11</span> Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or a prominent notice on the Platform. The &ldquo;Last updated&rdquo; date at the top of this page shows when this policy was last revised. Continued use of the Platform after changes are posted constitutes acceptance.</p></div>

<div id="p12" class="section"><h2><span class="section-num">12</span> Contact &amp; Complaints</h2>
<ul>
<li>Data Protection Officer: <a href="mailto:dpo@tradexpro.com">dpo@tradexpro.com</a></li>
<li>General enquiries: <a href="mailto:support@tradexpro.com">support@tradexpro.com</a></li>
<li>Post: DPO, TradeX Pro Limited, 22 Bishopsgate, London, EC2N 4BQ</li>
<li>ICO (UK supervisory authority): <a href="https://ico.org.uk/make-a-complaint" target="_blank" rel="noreferrer">ico.org.uk/make-a-complaint</a></li>
</ul></div>`
);

// ── RISK DISCLOSURE ─────────────────────────────────────────────────────────
const risk = page(
  'Risk Disclosure', 'Risk Warning', 'Risk Disclosure Statement',
  'Last updated: <strong>28 March 2026</strong> &nbsp;&middot;&nbsp; Please read carefully before trading',
  `<div class="warn-box"><span style="font-size:20px;flex-shrink:0">&#x26A0;&#xFE0F;</span><p><strong>Important:</strong> This Risk Disclosure Statement is required by the FCA and CySEC. By opening an account, you confirm you have read, understood, and accepted these risks. <strong>74% of retail investor accounts lose money when trading CFDs with TradeX Pro.</strong></p></div>
<nav class="toc"><h2>Table of Contents</h2><ul>
<li><a href="#r1">High Risk Investment</a></li><li><a href="#r2">CFD Risk</a></li>
<li><a href="#r3">Leverage Risk</a></li><li><a href="#r4">Forex Risk</a></li>
<li><a href="#r5">Cryptocurrency Risk</a></li><li><a href="#r6">Market Risk</a></li>
<li><a href="#r7">Liquidity Risk</a></li><li><a href="#r8">Technology Risk</a></li>
<li><a href="#r9">Counterparty Risk</a></li><li><a href="#r10">Regulatory Risk</a></li>
<li><a href="#r11">Tax Considerations</a></li><li><a href="#r12">Suitability Warning</a></li>
</ul></nav>

<div id="r1" class="section"><h2><span class="section-num">01</span> High Risk Investment Warning</h2>
<p>Trading financial instruments including CFDs, forex, cryptocurrencies, equities, commodities, and indices involves a high degree of risk to your capital. You should only trade with money you can afford to lose entirely. These are not investments in the traditional savings sense; they are speculative instruments.</p>
<div class="warn-box"><span style="font-size:20px;flex-shrink:0">&#x26A0;&#xFE0F;</span><p><strong>74% of retail investor accounts lose money when trading CFDs with TradeX Pro Limited.</strong> This statistic is based on our client data for the preceding 12-month period and is updated quarterly as required by our FCA and CySEC licences.</p></div>
<p>You should carefully consider your investment objectives, level of experience, risk appetite, and financial circumstances before opening a live account. If you are unsure, seek independent financial advice from a qualified financial adviser.</p></div>

<div id="r2" class="section"><h2><span class="section-num">02</span> Contracts for Difference (CFD) Risk</h2>
<p>A Contract for Difference (CFD) is a contract between you and TradeX Pro to exchange the difference in the value of a financial instrument between the time the contract is opened and the time it is closed.</p>
<p>Key CFD risks include:</p>
<ul>
<li>You do not own the underlying asset; you have a contractual right to the price difference</li>
<li>CFDs are over-the-counter (OTC) instruments; they are not traded on regulated exchanges</li>
<li>Losses can exceed your initial deposit unless Negative Balance Protection applies</li>
<li>Holding CFDs overnight incurs swap/financing costs which can erode returns</li>
<li>CFD pricing may differ from the underlying market price due to spreads</li>
<li>Positions may be closed by us if margin requirements are not maintained</li>
</ul></div>

<div id="r3" class="section"><h2><span class="section-num">03</span> Leverage &amp; Margin Risk</h2>
<p>Leverage amplifies both profits and losses. For example, at 30:1 leverage, a 1% adverse move in the underlying market results in a 30% loss on your margin. This means small market movements can have a disproportionately large impact.</p>
<p>You must maintain sufficient margin at all times. A <span class="hl">margin call</span> occurs when your account equity falls below the required margin level. If you do not deposit additional funds, some or all of your positions may be closed automatically at a loss. We are not obligated to provide advance notice before closing positions.</p>
<div class="warn-box"><span style="font-size:20px;flex-shrink:0">&#x26A0;&#xFE0F;</span><p>Leverage increases both potential gains <strong>and</strong> potential losses proportionally. A leveraged position can result in total loss of invested capital within a single trading session, especially during unexpected market events.</p></div></div>

<div id="r4" class="section"><h2><span class="section-num">04</span> Foreign Exchange (Forex) Risk</h2>
<p>Currency markets are the most liquid in the world but are subject to extreme volatility, particularly around central bank announcements, geopolitical events, and macroeconomic data releases. Exchange rate fluctuations can result in significant and rapid losses.</p>
<p>Additional forex-specific risks:</p>
<ul>
<li>Interest rate differentials affect swap costs on overnight positions</li>
<li>Exotic currency pairs carry higher spreads and lower liquidity</li>
<li>Currency interventions by central banks can cause sudden, large price movements</li>
<li>Emerging market currencies may be subject to capital controls or suspension of trading</li>
</ul></div>

<div id="r5" class="section"><h2><span class="section-num">05</span> Cryptocurrency Risk</h2>
<p>Cryptocurrency markets are highly speculative and significantly more volatile than traditional financial markets. Cryptocurrencies are not legal tender in most jurisdictions and are not backed by any government or central bank.</p>
<ul>
<li>Extreme price volatility: cryptocurrencies can move 50-80% within days</li>
<li>Regulatory uncertainty: governments may restrict or ban cryptocurrencies</li>
<li>Technology risk: protocol vulnerabilities, smart contract bugs, or network issues</li>
<li>Market manipulation: lower liquidity markets are susceptible to coordinated manipulation</li>
<li>24/7 markets: positions are exposed to overnight and weekend risk without ability to intervene</li>
</ul>
<div class="warn-box"><span style="font-size:20px;flex-shrink:0">&#x26A0;&#xFE0F;</span><p>Retail clients trading crypto CFDs on our platform are limited to <strong>2:1 maximum leverage</strong> in accordance with FCA requirements. Past performance of any cryptocurrency is not indicative of future performance.</p></div></div>

<div id="r6" class="section"><h2><span class="section-num">06</span> Market Risk</h2>
<p>All financial instruments are subject to market risk &mdash; the risk that the overall market or a specific instrument will decline in value. Factors include: economic conditions, inflation, political instability, interest rate changes, natural disasters, pandemics, and unexpected corporate announcements.</p>
<p>Past performance of any instrument is not a reliable indicator of future results. No trading strategy or system guarantees consistent profitability. The financial markets are inherently unpredictable.</p></div>

<div id="r7" class="section"><h2><span class="section-num">07</span> Liquidity Risk</h2>
<p>During periods of market stress, extreme volatility, or low trading volume (e.g., market open/close, public holidays), it may not be possible to execute trades at quoted prices. This is known as a <span class="hl">gap</span> or <span class="hl">slippage</span>. Stop-loss orders are not guaranteed to execute at the specified price.</p>
<p>Less liquid instruments such as exotic currency pairs, small-cap equity CFDs, or low-volume cryptocurrencies may have significantly wider spreads and may be temporarily unavailable for trading.</p></div>

<div id="r8" class="section"><h2><span class="section-num">08</span> Technology &amp; Operational Risk</h2>
<p>The Platform is delivered via internet-connected systems. Risks include: internet connectivity failure, system downtime, cyberattacks, software bugs, third-party data feed failures, server latency, and force majeure events.</p>
<p>We implement industry-standard security measures but cannot guarantee uninterrupted 24/7 service. You should have contingency plans for managing open positions if you cannot access the Platform. We are not liable for losses arising from technology failures beyond our reasonable control.</p></div>

<div id="r9" class="section"><h2><span class="section-num">09</span> Counterparty Risk</h2>
<p>All trades executed on TradeX Pro are OTC contracts between you and TradeX Pro Limited as counterparty. While client funds are held in segregated accounts and Negative Balance Protection applies to retail clients, there is a residual risk associated with the financial soundness of TradeX Pro as a counterparty.</p>
<p>TradeX Pro Limited is regulated by the FCA and CySEC, both of which set strict capital adequacy requirements designed to protect clients. In the event of insolvency, eligible retail clients may be entitled to compensation under the Financial Services Compensation Scheme (FSCS) up to &pound;85,000.</p></div>

<div id="r10" class="section"><h2><span class="section-num">10</span> Regulatory &amp; Political Risk</h2>
<p>Regulations governing financial instruments and trading platforms may change. New restrictions, taxes, or reporting requirements could adversely affect your positions, account access, or the availability of specific instruments. Trading restrictions may apply to residents of certain jurisdictions at any time.</p></div>

<div id="r11" class="section"><h2><span class="section-num">11</span> Tax Considerations</h2>
<p>Profits from CFD trading may be subject to capital gains tax, income tax, or other taxes depending on your jurisdiction, residency, and individual circumstances. TradeX Pro does not provide tax advice. It is your sole responsibility to understand and comply with your tax obligations. We recommend consulting a qualified tax adviser.</p></div>

<div id="r12" class="section"><h2><span class="section-num">12</span> Suitability Warning</h2>
<p>CFDs and leveraged products are <span class="hl">not appropriate for all investors</span>. Before trading, you should honestly assess:</p>
<ul>
<li>Your financial situation and whether you can afford to lose all invested capital</li>
<li>Your level of experience and understanding of leveraged products</li>
<li>Your risk tolerance and investment objectives</li>
<li>Whether you have time to actively monitor your positions</li>
</ul>
<p>If you are in any doubt, <strong>do not trade</strong>. Seek independent advice from a qualified and regulated financial adviser. The information on this Platform does not constitute financial or investment advice.</p></div>`
);

// ── COOKIE POLICY ───────────────────────────────────────────────────────────
const cookie = page(
  'Cookie Policy', 'Privacy', 'Cookie Policy',
  'Last updated: <strong>28 March 2026</strong> &nbsp;&middot;&nbsp; ePrivacy Compliant',
  `<div class="info-box"><span style="font-size:20px;flex-shrink:0">&#x1F36A;</span><p><strong>About this Policy:</strong> This Cookie Policy explains how TradeX Pro Limited uses cookies and similar technologies on our platform and website. It complies with the UK Privacy and Electronic Communications Regulations (PECR) and EU ePrivacy Directive.</p></div>
<nav class="toc"><h2>Table of Contents</h2><ul>
<li><a href="#c1">What Are Cookies</a></li><li><a href="#c2">Cookies We Use</a></li>
<li><a href="#c3">Third-Party Cookies</a></li><li><a href="#c4">Managing Cookies</a></li>
<li><a href="#c5">Similar Technologies</a></li><li><a href="#c6">Changes</a></li>
<li><a href="#c7">Contact</a></li>
</ul></nav>

<div id="c1" class="section"><h2><span class="section-num">01</span> What Are Cookies?</h2>
<p>Cookies are small text files placed on your device when you visit a website or use a web application. They allow the website to recognise your device, remember your preferences, keep you logged in, and understand how you use the service. Cookies are widely used to make websites work efficiently and to provide reporting information.</p>
<p>Cookies can be <span class="hl">first-party</span> (set by TradeX Pro directly) or <span class="hl">third-party</span> (set by external services we use). They can be <span class="hl">session cookies</span> (deleted when you close your browser) or <span class="hl">persistent cookies</span> (remain until they expire or are deleted).</p></div>

<div id="c2" class="section"><h2><span class="section-num">02</span> Cookies We Use</h2>
<p><span class="hl">Strictly Necessary Cookies</span> &mdash; These are essential for the Platform to function. They enable secure login, session management, and core trading features. They cannot be disabled. Legal basis: legitimate interests / contract performance.</p>
<ul>
<li><code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">tradex_session</code> &mdash; Your authenticated session token (Supabase). Expires: session.</li>
<li><code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">tradex_auth_token</code> &mdash; JWT authentication token. Expires: 7 days.</li>
<li><code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">tradex_csrf</code> &mdash; CSRF protection token. Expires: session.</li>
</ul>
<p><span class="hl">Functional Cookies</span> &mdash; These remember your preferences and personalise your experience. Legal basis: consent.</p>
<ul>
<li><code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">tradex_theme</code> &mdash; UI theme preference (dark/light). Expires: 1 year.</li>
<li><code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">tradex_chart_settings</code> &mdash; TradingView chart layout and indicator preferences. Expires: 1 year.</li>
<li><code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">tradex_locale</code> &mdash; Language and currency display preference. Expires: 1 year.</li>
</ul>
<p><span class="hl">Analytics Cookies</span> &mdash; We use anonymised analytics to understand how clients use the Platform and to improve it. Legal basis: legitimate interests (with opt-out available).</p>
<ul>
<li><code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">_tradex_analytics</code> &mdash; Anonymised session and feature usage data. Expires: 90 days.</li>
</ul>
<p><span class="hl">Performance Cookies</span> &mdash; Cookies that help us measure and improve the speed and reliability of the Platform. Legal basis: legitimate interests.</p>
<p><span class="hl">Marketing Cookies</span> &mdash; Only set with your explicit consent. Used to deliver relevant promotions to existing clients. Legal basis: consent.</p></div>

<div id="c3" class="section"><h2><span class="section-num">03</span> Third-Party Cookies</h2>
<p>The following third parties may set cookies through our Platform:</p>
<ul>
<li><span class="hl">Supabase</span> &mdash; Authentication and database provider. Privacy policy: <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">supabase.com/privacy</a></li>
<li><span class="hl">TradingView Charting Library</span> &mdash; Advanced charting. Cookies used for chart preferences only. Privacy: <a href="https://www.tradingview.com/privacy-policy" target="_blank" rel="noreferrer">tradingview.com/privacy-policy</a></li>
<li><span class="hl">Cloudflare</span> &mdash; CDN, DDoS protection, performance. Cookies: <code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">__cf_bm</code>, <code style="color:#38bdf8;background:rgba(14,165,233,.1);padding:2px 6px;border-radius:4px">cf_clearance</code>. Privacy: <a href="https://cloudflare.com/privacypolicy" target="_blank" rel="noreferrer">cloudflare.com/privacypolicy</a></li>
</ul></div>

<div id="c4" class="section"><h2><span class="section-num">04</span> Managing &amp; Withdrawing Consent</h2>
<p>When you first visit the Platform, you will be shown a cookie consent banner allowing you to accept or decline non-essential cookies. You can change your preferences at any time by:</p>
<ul>
<li>Clicking the <span class="hl">&ldquo;Cookie Settings&rdquo;</span> link in the Platform footer</li>
<li>Using your browser&rsquo;s cookie management settings (see links below)</li>
<li>Contacting our DPO at <a href="mailto:dpo@tradexpro.com">dpo@tradexpro.com</a></li>
</ul>
<p>Disabling strictly necessary cookies will prevent you from logging in and using core Platform features. Browser cookie settings:</p>
<ul>
<li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Google Chrome</a></li>
<li><a href="https://support.mozilla.org/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noreferrer">Mozilla Firefox</a></li>
<li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471" target="_blank" rel="noreferrer">Apple Safari</a></li>
<li><a href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge" target="_blank" rel="noreferrer">Microsoft Edge</a></li>
</ul></div>

<div id="c5" class="section"><h2><span class="section-num">05</span> Similar Technologies</h2>
<p>In addition to cookies, we may use:</p>
<ul>
<li><span class="hl">Local Storage / Session Storage:</span> Browser-side storage for Platform preferences and temporary trading state (e.g., watchlist, chart layout). This data never leaves your device and is not transmitted to our servers.</li>
<li><span class="hl">Pixel tags / web beacons:</span> Used in transactional emails (e.g., deposit confirmation) to confirm delivery. You can disable these by setting your email client to not load external images.</li>
</ul></div>

<div id="c6" class="section"><h2><span class="section-num">06</span> Changes to This Policy</h2>
<p>We may update this Cookie Policy to reflect changes in technology, legislation, or our use of cookies. We will notify you of material changes via the cookie consent banner or email. The &ldquo;Last updated&rdquo; date at the top confirms the currency of this policy.</p></div>

<div id="c7" class="section"><h2><span class="section-num">07</span> Contact</h2>
<ul>
<li>Data Protection Officer: <a href="mailto:dpo@tradexpro.com">dpo@tradexpro.com</a></li>
<li>Post: DPO, TradeX Pro Limited, 22 Bishopsgate, London, EC2N 4BQ</li>
<li>ICO (UK supervisory authority): <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a></li>
</ul></div>`
);

fs.writeFileSync(path.join(out, 'terms-of-service.html'), tos, 'utf8');
fs.writeFileSync(path.join(out, 'privacy-policy.html'), privacy, 'utf8');
fs.writeFileSync(path.join(out, 'risk-disclosure.html'), risk, 'utf8');
fs.writeFileSync(path.join(out, 'cookie-policy.html'), cookie, 'utf8');
console.log('All 4 legal pages written successfully.');
