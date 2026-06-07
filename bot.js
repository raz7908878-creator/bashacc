require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const input = require('input');
const fs = require('fs');
const path = require('path');
const express = require('express');

/* -------------------------------------------------------------------------- */
/*                          WEB SERVER (KEEP-ALIVE)                           */
/* -------------------------------------------------------------------------- */

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(' ');
}

app.get('/', (req, res) => {
    const uptime = formatUptime(Date.now() - startTime);
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SRF OTP Bot — Status</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        :root{
            --bg:#0a0a0f;
            --card:#12121a;
            --border:rgba(255,255,255,.06);
            --glow-1:#6366f1;
            --glow-2:#a855f7;
            --glow-3:#06b6d4;
            --text:#e2e8f0;
            --text-dim:#64748b;
            --green:#22c55e;
            --green-dim:rgba(34,197,94,.12);
        }
        body{
            font-family:'Inter',system-ui,sans-serif;
            background:var(--bg);
            color:var(--text);
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
            position:relative;
        }
        /* Animated background orbs */
        .orb{
            position:fixed;
            border-radius:50%;
            filter:blur(100px);
            opacity:.15;
            animation:float 20s ease-in-out infinite;
            pointer-events:none;
        }
        .orb-1{width:600px;height:600px;background:var(--glow-1);top:-200px;left:-100px;animation-delay:0s}
        .orb-2{width:500px;height:500px;background:var(--glow-2);bottom:-150px;right:-100px;animation-delay:-7s}
        .orb-3{width:400px;height:400px;background:var(--glow-3);top:50%;left:50%;transform:translate(-50%,-50%);animation-delay:-14s}
        @keyframes float{
            0%,100%{transform:translate(0,0) scale(1)}
            25%{transform:translate(30px,-40px) scale(1.05)}
            50%{transform:translate(-20px,30px) scale(.95)}
            75%{transform:translate(-40px,-20px) scale(1.02)}
        }
        .container{
            position:relative;
            z-index:1;
            width:100%;
            max-width:480px;
            padding:24px;
        }
        .card{
            background:var(--card);
            border:1px solid var(--border);
            border-radius:24px;
            padding:48px 36px;
            backdrop-filter:blur(20px);
            box-shadow:
                0 0 0 1px rgba(255,255,255,.03),
                0 25px 50px -12px rgba(0,0,0,.5),
                inset 0 1px 0 rgba(255,255,255,.04);
            text-align:center;
            animation:slideUp .8s cubic-bezier(.16,1,.3,1);
        }
        @keyframes slideUp{
            from{opacity:0;transform:translateY(30px)}
            to{opacity:1;transform:translateY(0)}
        }
        /* Pulse ring */
        .status-ring{
            width:88px;height:88px;
            margin:0 auto 28px;
            position:relative;
            display:flex;align-items:center;justify-content:center;
        }
        .status-ring::before{
            content:'';
            position:absolute;
            inset:0;
            border-radius:50%;
            background:var(--green-dim);
            animation:pulse-ring 2.5s ease-out infinite;
        }
        .status-ring::after{
            content:'';
            position:absolute;
            width:48px;height:48px;
            border-radius:50%;
            background:var(--green);
            box-shadow:0 0 24px rgba(34,197,94,.4);
            animation:pulse-dot 2.5s ease-in-out infinite;
        }
        @keyframes pulse-ring{
            0%{transform:scale(.8);opacity:.6}
            80%,100%{transform:scale(1.6);opacity:0}
        }
        @keyframes pulse-dot{
            0%,100%{transform:scale(1)}
            50%{transform:scale(1.08)}
        }
        .title{
            font-size:1.5rem;
            font-weight:800;
            letter-spacing:-.02em;
            margin-bottom:6px;
            background:linear-gradient(135deg,#fff,#94a3b8);
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
        }
        .subtitle{
            font-size:.875rem;
            color:var(--text-dim);
            margin-bottom:32px;
            font-weight:500;
        }
        .stats{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:12px;
            margin-bottom:24px;
        }
        .stat{
            background:rgba(255,255,255,.03);
            border:1px solid var(--border);
            border-radius:14px;
            padding:18px 14px;
            transition:all .3s ease;
        }
        .stat:hover{
            background:rgba(255,255,255,.05);
            border-color:rgba(255,255,255,.1);
            transform:translateY(-2px);
        }
        .stat-label{
            font-size:.7rem;
            text-transform:uppercase;
            letter-spacing:.08em;
            color:var(--text-dim);
            margin-bottom:6px;
            font-weight:600;
        }
        .stat-value{
            font-size:1.05rem;
            font-weight:700;
            color:#fff;
        }
        .stat-value.online{color:var(--green)}
        .footer{
            font-size:.75rem;
            color:var(--text-dim);
            padding-top:8px;
            opacity:.7;
        }
        .footer span{
            color:var(--glow-2);
            font-weight:600;
        }
        /* Scanline effect */
        .card::before{
            content:'';
            position:absolute;
            inset:0;
            border-radius:24px;
            background:repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,.005) 2px,
                rgba(255,255,255,.005) 4px
            );
            pointer-events:none;
        }
        .card{position:relative;overflow:hidden}
        /* Shimmer */
        .card::after{
            content:'';
            position:absolute;
            top:-50%;left:-50%;
            width:200%;height:200%;
            background:linear-gradient(
                45deg,
                transparent 40%,
                rgba(255,255,255,.02) 50%,
                transparent 60%
            );
            animation:shimmer 8s ease-in-out infinite;
            pointer-events:none;
        }
        @keyframes shimmer{
            0%,100%{transform:translateX(-100%) rotate(0)}
            50%{transform:translateX(100%) rotate(0)}
        }
        #uptime{font-variant-numeric:tabular-nums}
    </style>
</head>
<body>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>

    <div class="container">
        <div class="card">
            <div class="status-ring"></div>
            <div class="title">SRF OTP Bot</div>
            <div class="subtitle">System operational — all services running</div>
            <div class="stats">
                <div class="stat">
                    <div class="stat-label">Status</div>
                    <div class="stat-value online">● Online</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Uptime</div>
                    <div class="stat-value" id="uptime">${uptime}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Environment</div>
                    <div class="stat-value">Render</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Mode</div>
                    <div class="stat-value">Polling</div>
                </div>
            </div>
            <div class="footer">Powered by <span>Node.js</span> · Auto-refresh 30s</div>
        </div>
    </div>

    <script>
        // Live uptime counter
        const startMs = ${startTime};
        const el = document.getElementById('uptime');
        function fmt(ms){
            const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sec=s%60;
            const p=[];
            if(d>0)p.push(d+'d');
            if(h>0)p.push(h+'h');
            if(m>0)p.push(m+'m');
            p.push(sec+'s');
            return p.join(' ');
        }
        setInterval(()=>{el.textContent=fmt(Date.now()-startMs)},1000);
        // Auto-refresh page every 30s to keep connection alive
        setTimeout(()=>location.reload(),30000);
    </script>
</body>
</html>`);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: formatUptime(Date.now() - startTime) });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;
const groupId = process.env.GROUP_ID;
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;

if (!token) {
    console.error("❌ ERROR: BOT_TOKEN is missing in .env file");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const dataFilePath = path.join(__dirname, 'numbers.json');

const adminState = {};
const activeUsers = {}; // Maps chatId -> { number, timeout }

/* -------------------------------------------------------------------------- */
/*                                DATA STORAGE                                */
/* -------------------------------------------------------------------------- */

function loadNumbers() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = fs.readFileSync(dataFilePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error("❌ Error reading numbers.json:", err.message);
    }
    return [];
}

function saveNumbers(numbers) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(numbers, null, 2));
    } catch (err) {
        console.error("❌ Error writing numbers.json:", err.message);
    }
}

function isAdmin(id) {
    return id.toString() === adminId;
}

/* -------------------------------------------------------------------------- */
/*                                 USER COMMANDS                              */
/* -------------------------------------------------------------------------- */

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (msg.chat.type !== 'private') return; // Ignore if typed in group

    const text = `🌟 *Welcome to the Auto OTP Bot!* 🌟\n\nClick the button below to fetch a number and get started.`;
    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '📞 Get Number', callback_data: 'get_number' }]]
        }
    };
    bot.sendMessage(chatId, text, opts).catch(err => console.error("Failed to send /start:", err.message));
});

/* -------------------------------------------------------------------------- */
/*                                ADMIN COMMANDS                              */
/* -------------------------------------------------------------------------- */

bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    if (msg.chat.type !== 'private') return;
    
    if (!isAdmin(msg.from.id)) {
        return bot.sendMessage(chatId, "⛔ *Unauthorized Access*", { parse_mode: 'Markdown' })
                  .catch(e => console.error(e.message));
    }
    
    sendAdminPanel(chatId);
});

function sendAdminPanel(chatId, messageIdToEdit = null) {
    const numbers = loadNumbers();
    const activeCount = Object.keys(activeUsers).length;

    const text = `📊 *Admin Dashboard*\n\n` +
                 `📥 *Available Numbers:* \`${numbers.length}\`\n` +
                 `👥 *Active Users Session:* \`${activeCount}\`\n\n` +
                 `_Select an action below:_`;

    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '➕ Add Numbers', callback_data: 'admin_add_numbers' }],
                [{ text: '⬇️ Download Remaining', callback_data: 'admin_download' }],
                [{ text: '🗑 Clear All Numbers', callback_data: 'admin_clear_prompt' }]
            ]
        }
    };

    if (messageIdToEdit) {
        opts.chat_id = chatId;
        opts.message_id = messageIdToEdit;
        bot.editMessageText(text, opts).catch(e => console.error("Admin edit error:", e.message));
    } else {
        bot.sendMessage(chatId, text, opts).catch(e => console.error("Admin send error:", e.message));
    }
}

/* -------------------------------------------------------------------------- */
/*                               MESSAGE LISTENER                             */
/* -------------------------------------------------------------------------- */

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    

    // --> ADMIN STATE INPUT <--
    if (msg.from && isAdmin(msg.from.id) && adminState[chatId] === 'awaiting_numbers') {
        if (!msg.text || msg.text.startsWith('/')) {
            delete adminState[chatId];
            return;
        }

        // Handle cancellation
        if (msg.text.toLowerCase() === 'cancel') {
            delete adminState[chatId];
            return bot.sendMessage(chatId, "✅ Action cancelled. Use /admin to view dashboard.").catch(e => {});
        }

        delete adminState[chatId];
        const newNumbers = msg.text.split(/[\s,]+/).filter(n => n.trim() !== "");
        
        if (newNumbers.length === 0) {
            return bot.sendMessage(chatId, "⚠️ *No valid numbers found.* Action cancelled.", {parse_mode: 'Markdown'})
                      .catch(e => {});
        }
        
        let numbers = loadNumbers();
        numbers = numbers.concat(newNumbers);
        saveNumbers(numbers);

        bot.sendMessage(chatId, `✅ *Successfully Added!*\n\nAdded \`${newNumbers.length}\` numbers.\nTotal pool: \`${numbers.length}\`\n\n_Use /admin to return to the dashboard._`, {parse_mode: 'Markdown'})
           .catch(e => console.error(e.message));
    }
});

/* -------------------------------------------------------------------------- */
/*                               CALLBACK QUERIES                             */
/* -------------------------------------------------------------------------- */

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    // --- ADMIN CALLBACKS ---
    if (data.startsWith('admin_')) {
        if (!isAdmin(query.from.id)) {
            return bot.answerCallbackQuery(query.id, {text: "⛔ Unauthorized", show_alert: true}).catch(e=>{});
        }

        if (data === 'admin_add_numbers') {
            adminState[chatId] = 'awaiting_numbers';
            bot.sendMessage(chatId, "✍️ *Send the list of numbers now.*\n\n_(Paste multiple lines, or type 'cancel' to abort)_", {parse_mode: 'Markdown'})
               .catch(e => console.error(e.message));
            return bot.answerCallbackQuery(query.id).catch(e=>{});
        }

        if (data === 'admin_download') {
            const numbers = loadNumbers();
            if (numbers.length === 0) {
                return bot.answerCallbackQuery(query.id, {text: "⚠️ No numbers to download.", show_alert: true}).catch(e=>{});
            }
            
            const fileBuffer = Buffer.from(numbers.join('\n'), 'utf-8');
            bot.sendDocument(chatId, fileBuffer, {}, { filename: 'remaining_numbers.txt', contentType: 'text/plain' })
               .then(() => bot.answerCallbackQuery(query.id))
               .catch(e => {
                   console.error("File send error:", e.message);
                   bot.answerCallbackQuery(query.id, {text: "❌ Failed to send file.", show_alert: true}).catch(e2=>{});
               });
            return;
        }

        if (data === 'admin_clear_prompt') {
            const opts = {
                chat_id: chatId, message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⚠️ YES, Delete All', callback_data: 'admin_clear_confirm' }],
                        [{ text: '❌ Cancel', callback_data: 'admin_dashboard' }]
                    ]
                }
            };
            bot.editMessageText("🛑 *CAUTION*\n\nAre you sure you want to delete ALL unused numbers?", opts)
               .catch(e => console.error(e.message));
            return bot.answerCallbackQuery(query.id).catch(e=>{});
        }

        if (data === 'admin_clear_confirm') {
            saveNumbers([]); // Clear out the file safely
            bot.answerCallbackQuery(query.id, {text: "🗑 Numbers Cleared!", show_alert: true}).catch(e=>{});
            return sendAdminPanel(chatId, messageId);
        }

        if (data === 'admin_dashboard') {
            bot.answerCallbackQuery(query.id).catch(e=>{});
            return sendAdminPanel(chatId, messageId);
        }
    }

    // --- USER CALLBACKS ---
    if (data === 'get_number' || data === 'change_number') {
        let numbers = loadNumbers();

        if (numbers.length === 0) {
            return bot.answerCallbackQuery(query.id, { text: "⚠️ No numbers available right now. Please try again later.", show_alert: true }).catch(e=>{});
        }

        // Clean up previous timer if user had an active number
        if (activeUsers[chatId]) {
            clearTimeout(activeUsers[chatId].timeout);
            delete activeUsers[chatId];
        }

        const newNumber = numbers.shift(); // Remove from pool permanently
        saveNumbers(numbers);

        const expirationTimeout = setTimeout(() => {
            if (activeUsers[chatId] && activeUsers[chatId].number === newNumber) {
                const targetMsgId = activeUsers[chatId].messageId;
                delete activeUsers[chatId];
                
                const timeText = `⏳ *Time Expired!*\n\n` +
                                 `Your 15-minute window for number \`${newNumber}\` has ended.\n` +
                                 `_Need another one? Click below!_`;
                
                // Delete the old "Waiting for OTP..." message
                if (targetMsgId) {
                    bot.deleteMessage(chatId, targetMsgId).catch(e=>{});
                }
                
                bot.sendMessage(chatId, timeText, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '📞 Get New Number', callback_data: 'get_number' }]]
                    }
                }).catch(e => console.error("Timeout message fail:", e.message));
            }
        }, 15 * 60 * 1000); // 15 mins

        activeUsers[chatId] = {
            number: newNumber,
            timeout: expirationTimeout,
            messageId: data === 'change_number' ? messageId : null
        };

        const inlineKeyboardOpts = {
            inline_keyboard: [
                [
                    { text: '🔄 Change Number', callback_data: 'change_number' },
                    { text: '💬 OTP Group', url: 'https://t.me/+9ErqTQYsCv8wYzJl' }
                ]
            ]
        };

        const text = `✅ *Success!* Here is your number:\n\n` +
                     `📱 \`${newNumber}\`\n\n` + 
                     `_Waiting for OTP... Maximum time 15 minutes._`;
        
        if (data === 'change_number') {
            // For change number, cleanly edit the current message
            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboardOpts
            }).then(() => {
                 if (activeUsers[chatId]) activeUsers[chatId].messageId = messageId;
            }).catch(err => {
                // Fallback if edit fails
                bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: inlineKeyboardOpts }).then(sentMsg => {
                    if (activeUsers[chatId]) activeUsers[chatId].messageId = sentMsg.message_id;
                }).catch(e=>{});
            });
        } else {
            // For get_number (from OTP, Expired, or Welcome message), strip old buttons and send a fresh message
            bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                chat_id: chatId,
                message_id: messageId
            }).catch(e => {});

            bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboardOpts
            }).then(sentMsg => {
                if (activeUsers[chatId]) activeUsers[chatId].messageId = sentMsg.message_id;
            }).catch(e => {});
        }
        
        bot.answerCallbackQuery(query.id, { text: "✅ Number assigned!" }).catch(e=>{});
    }
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    bot.stopPolling();
    process.exit(0);
});

console.log("🚀 Server initialized. Bot is up and running in polling mode.");

// Start GramJS Userbot silent listener
(async () => {
    if (!apiId || !apiHash) {
        console.warn("⚠️ API_ID or API_HASH missing in .env. Silent group listener will NOT start.");
        return;
    }

    console.log("Loading userbot silent listener...");
    let sessionStr = '';
    const sessionPath = path.join(__dirname, 'userbot_session.txt');
    if (fs.existsSync(sessionPath)) {
        sessionStr = fs.readFileSync(sessionPath, 'utf8');
    }
    const stringSession = new StringSession(sessionStr);

    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () => await input.text("Please enter your number (e.g. +1234567890): "),
        password: async () => await input.text("Please enter your password (if you have 2FA): "),
        phoneCode: async () => await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });

    console.log("✅ Userbot successfully connected.");
    fs.writeFileSync(sessionPath, client.session.save());

    client.addEventHandler(async (event) => {
        const msg = event.message;
        if (!msg || !msg.text) return;

        try {
            const chat = await msg.getChat();
            if (!chat) return;

            const msgChatIdStr = chat.id.toString();
            const targetGroupIdStr = groupId ? groupId.toString().replace('-100', '') : '';
            
            if (groupId && !(msgChatIdStr.includes(targetGroupIdStr) || ('-100' + msgChatIdStr) === groupId.toString())) {
                return; // Not our target group
            }

            const maskedMatch = msg.text.match(/(\d+)[•*]+(\d+)/);
            if (maskedMatch) {
                const textWithoutMasked = msg.text.replace(maskedMatch[0], '');
                const otpMatch = textWithoutMasked.match(/(?<!\d)(\d{8}|\d{6}|\d{5})(?!\d)/);

                if (otpMatch) {
                    const prefix = maskedMatch[1];
                    const suffix = maskedMatch[2];
                    const otp = otpMatch[1];

                    for (const [uid, data] of Object.entries(activeUsers)) {
                        if (data.number.startsWith(prefix) && data.number.endsWith(suffix)) {
                            clearTimeout(data.timeout);
                            
                            if (data.messageId) {
                                bot.deleteMessage(uid, data.messageId).catch(e => {});
                            }
                            
                            delete activeUsers[uid];
                            
                            const text = `🎉 *OTP Successfully Received!*\n\n` +
                                         `📱 *Number:* \`${data.number}\`\n` +
                                         `🔑 *OTP Code:* \`${otp}\`\n\n` +
                                         `_Your session is complete. Grab a new number below!_`;
                            
                            bot.sendMessage(uid, text, {
                                parse_mode: 'Markdown',
                                reply_markup: {
                                    inline_keyboard: [[{ text: '📞 Get New Number', callback_data: 'get_number' }]]
                                }
                            }).catch(e => console.error("Failed to send OTP to user:", e.message));
                            
                            break;
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error in Userbot event handler:", err.message);
        }
    }, new NewMessage({}));

    console.log(`🎧 Userbot is silently listening to group ${groupId}...`);
})();
