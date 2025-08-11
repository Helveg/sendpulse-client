/*
 * Sendpulse REST API Node.js class
 *
 * Documentation
 * https://login.sendpulse.com/manual/rest-api/
 * https://sendpulse.com/api
 *
 */


'use strict';

const crypto = require('crypto');
const axios = require("axios");

const API_URL = 'https://api.sendpulse.com';
let API_USER_ID = '';
let API_SECRET = '';
let TOKEN = '';
const TOKEN_STORAGE = {};

/**
 * MD5
 *
 * @param data
 * @return string
 */
function md5(data) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(data);
    return md5sum.digest('hex');
}

/**
 * Base64
 *
 * @param data
 * @return string
 */
function base64(data) {
    var b = new Buffer(data);
    return b.toString('base64');
}


/**
 * Sendpulse API initialization
 *
 * @param client_id
 * @param secret
 */
async function init(client_id, secret) {
    API_USER_ID = client_id;
    API_SECRET = secret;

    let hashName = md5(API_USER_ID + '::' + API_SECRET);
    if (TOKEN_STORAGE[hashName]) {
        TOKEN = TOKEN_STORAGE[hashName];
    }

    if (!TOKEN.length) {
        await getToken();
    }
}

/**
 * Form and send request to API service
 *
 * @param path
 * @param method
 * @param data
 * @param useToken
 *        Define the function  that will be called
 *        when a response is received.
 */
async function sendRequest(path, method, data, useToken) {
    const headers = {};
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));

    if (useToken && TOKEN.length) {
        headers['Authorization'] = 'Bearer ' + TOKEN;
    }
    if (method === undefined) {
        method = 'POST';
    }

    const response = await axios.request({method, url: API_URL + '/' + path, data, headers});

    return response.data;
}

/**
 * Get token and store it
 *
 */
async function getToken() {
    const data = await sendRequest('oauth/access_token', 'POST', {
        grant_type: 'client_credentials',
        client_id: API_USER_ID,
        client_secret: API_SECRET
    }, false);

    TOKEN = data.access_token;
    const hashName = md5(API_USER_ID + '::' + API_SECRET);
    TOKEN_STORAGE[hashName] = TOKEN;
}

/**
 * Serializing of the array
 *
 * @param mixed_value
 * @return string
 */
function serialize(mixed_value) {
    var val, key, okey,
        ktype = '',
        vals = '',
        count = 0,
        _utf8Size = function (str) {
            var size = 0,
                i = 0,
                l = str.length,
                code = '';
            for (i = 0; i < l; i++) {
                code = str.charCodeAt(i);
                if (code < 0x0080) { //[0x0000, 0x007F]
                    size += 1;
                } else if (code < 0x0800) { //[0x0080, 0x07FF]
                    size += 2;
                } else if (code < 0xD800) { //[0x0800, 0xD7FF]
                    size += 3;
                } else if (code < 0xDC00) { //[0xD800, 0xDBFF]
                    var lo = str.charCodeAt(++i);
                    if (i < l && lo >= 0xDC00 && lo <= 0xDFFF) { //followed by [0xDC00, 0xDFFF]
                        size += 4;
                    } else {
                        // UCS-2 String malformed
                        size = 0
                    }
                } else if (code < 0xE000) { //[0xDC00, 0xDFFF]
                    //  UCS-2 String malformed
                    size = 0
                } else { //[0xE000, 0xFFFF]
                    size += 3;
                }
            }
            return size;
        },
        _getType = function (inp) {
            var match, key, cons, types, type = typeof inp;

            if (type === 'object' && !inp) {
                return 'null';
            }

            if (type === 'object') {
                if (!inp.constructor) {
                    return 'object';
                }
                cons = inp.constructor.toString();
                match = cons.match(/(\w+)\(/);
                if (match) {
                    cons = match[1].toLowerCase();
                }
                types = ['boolean', 'number', 'string', 'array'];
                for (key in types) {
                    if (cons === types[key]) {
                        type = types[key];
                        break;
                    }
                }
            }
            return type;
        },
        type = _getType(mixed_value);

    switch (type) {
        case 'function':
            val = '';
            break;
        case 'boolean':
            val = 'b:' + (mixed_value ? '1' : '0');
            break;
        case 'number':
            val = (Math.round(mixed_value) === mixed_value ? 'i' : 'd') + ':' + mixed_value;
            break;
        case 'string':
            val = 's:' + _utf8Size(mixed_value) + ':"' + mixed_value + '"';
            break;
        case 'array':
        case 'object':
            val = 'a';
            for (key in mixed_value) {
                if (mixed_value.hasOwnProperty(key)) {
                    ktype = _getType(mixed_value[key]);
                    if (ktype === 'function') {
                        continue;
                    }

                    okey = (key.match(/^[0-9]+$/) ? parseInt(key, 10) : key);
                    vals += serialize(okey) + serialize(mixed_value[key]);
                    count++;
                }
            }
            val += ':' + count + ':{' + vals + '}';
            break;
        case 'undefined':
        default:
            val = 'N';
            break;
    }
    if (type !== 'object' && type !== 'array') {
        val += ';';
    }
    return val;
}

/**
 * API interface implementation
 */

/**
 * Get list of address books
 *
 * @param limit
 * @param offset
 */
async function listAddressBooks(limit, offset) {
    var data = {};
    if (limit === undefined) {
        limit = null;
    } else {
        data['limit'] = limit;
    }
    if (offset === undefined) {
        offset = null;
    } else {
        data['offset'] = offset;
    }
    return sendRequest('addressbooks', 'GET', data, true);
}

/**
 * Create address book
 *
 * @param bookName
 */
async function createAddressBook(bookName) {
    if ((bookName === undefined) || (!bookName.length)) {
        throw new Error('Empty book name');
    }
    var data = {bookName: bookName};
    return sendRequest('addressbooks', 'POST', data, true);
}

/**
 * Edit address book name
 *
 * @param id
 * @param bookName
 */
async function editAddressBook(id, bookName) {
    if ((id === undefined) || (bookName === undefined) || (!bookName.length)) {
        throw new Error('Empty book name or book id');
    }
    var data = {name: bookName};
    return sendRequest('addressbooks/' + id, 'PUT', data, true);
}

/**
 * Remove address book
 *
 * @param id
 */
async function removeAddressBook(id) {
    if (id === undefined) {
        throw new Error('Empty book id');
    }
    return sendRequest('addressbooks/' + id, 'DELETE', {}, true);
}

/**
 * Get list of email templates
 *
 */
async function listEmailTemplates() {
    return sendRequest('templates', 'GET', {}, true);
}

/**
 * Get email template by id
 *
 * @param id
 */
async function getEmailTemplate(id) {
    if (id === undefined) {
        throw new Error('Empty email template id');
    }
    return sendRequest('template/' + id, 'GET', {}, true);
}

/**
 * Get information about book
 *
 * @param id
 */
async function getBookInfo(id) {
    if (id === undefined) {
        throw new Error('Empty book id');
    }
    return sendRequest('addressbooks/' + id, 'GET', {}, true);
}

/**
 * List email addresses from book
 *
 * @param id
 */
async function getEmailsFromBook(id) {
    if (id === undefined) {
        throw new Error('Empty book id');
    }
    return sendRequest('addressbooks/' + id + '/emails', 'GET', {}, true);
}

/**
 * Add new emails to address book
 *
 * @param id
 * @param emails
 */
async function addEmails(id, emails) {
    if ((id === undefined) || (emails === undefined) || (!emails.length)) {
        throw new Error('Empty email or book id');
    }
    var data = {emails: serialize(emails)};
    return sendRequest('addressbooks/' + id + '/emails', 'POST', data, true);
}

/**
 * Remove email addresses from book
 *
 * @param id
 * @param emails
 */
async function removeEmails(id, emails) {
    if ((id === undefined) || (emails === undefined) || (!emails.length)) {
        throw new Error('Empty email or book id');
    }
    var data = {emails: serialize(emails)};
    return sendRequest('addressbooks/' + id + '/emails', 'DELETE', data, true);
}

/**
 * Get information about email address from book
 *
 * @param id
 * @param email
 */
async function getEmailInfo(id, email) {
    if ((id === undefined) || (email === undefined) || (!email.length)) {
        throw new Error('Empty email or book id');
    }
    return sendRequest('addressbooks/' + id + '/emails/' + email, 'GET', {}, true);

}

/**
 * Update Variables for an email address in an address book
 *
 * @param id
 * @param email
 * @param variables
 */
async function updateEmailVariables(id, email, variables) {
    if ((id === undefined) || (email === undefined) || (variables === undefined) || (!variables.length)) {
        throw new Error('Empty email, variables or book id');
    }
    var data = {
        email: email,
        variables: variables
    };
    return sendRequest('addressbooks/' + id + '/emails/variable', 'POST', data, true);
}

/**
 * Get cost of campaign based on address book
 *
 * @param id
 */
async function campaignCost(id) {
    if (id === undefined) {
        throw new Error('Empty book id');
    }
    return sendRequest('addressbooks/' + id + '/cost', 'GET', {}, true);
}

/**
 * Get list of campaigns
 *
 * @param limit
 * @param offset
 */
async function listCampaigns(limit, offset) {
    var data = {};
    if (limit === undefined) {
        limit = null;
    } else {
        data['limit'] = limit;
    }
    if (offset === undefined) {
        offset = null;
    } else {
        data['offset'] = offset;
    }
    return sendRequest('campaigns', 'GET', data, true);
}

/**
 * Get information about campaign
 *
 * @param id
 */
async function getCampaignInfo(id) {
    if (id === undefined) {
        throw new Error('Empty book id');
    }
    return sendRequest('campaigns/' + id, 'GET', {}, true);
}

/**
 * Get campaign statistic by countries
 *
 * @param id
 */
async function campaignStatByCountries(id) {
    if (id === undefined) {
        throw new Error('Empty book id');
    }
    return sendRequest('campaigns/' + id + '/countries', 'GET', {}, true);
}

/**
 * Get campaign statistic by referrals
 *
 * @param id
 */
async function campaignStatByReferrals(id) {
    if (id === undefined) {
        throw new Error('Empty book id');
    }
    return sendRequest('campaigns/' + id + '/referrals', 'GET', {}, true);
}

/**
 * Create new campaign
 *
 * @param senderName
 * @param senderEmail
 * @param subject
 * @param body
 * @param bookId
 * @param name
 * @param attachments
 */
async function createCampaign(senderName, senderEmail, subject, body, bookId, name, attachments) {
    if ((senderName === undefined) || (!senderName.length) || (senderEmail === undefined) || (!senderEmail.length) || (subject === undefined) || (!subject.length) || (body === undefined) || (!body.length) || (bookId === undefined)) {
        throw new Error('Not all data.');
    }
    if (name === undefined) {
        name = '';
    }
    if (attachments === undefined) {
        attachments = '';
    }
    if (attachments.length) {
        attachments = serialize(attachments);
    }
    var data = {
        sender_name: senderName,
        sender_email: senderEmail,
        //subject: encodeURIComponent(subject),
        //subject: urlencode(subject),
        subject: subject,
        body: base64(body),
        list_id: bookId,
        name: name,
        attachments: attachments
    };
    return sendRequest('campaigns', 'POST', data, true);
}

/**
 * Cancel campaign
 *
 * @param id
 */
async function cancelCampaign(id) {
    if (id === undefined) {
        throw new Error('Empty campaign id');
    }
    return sendRequest('campaigns/' + id, 'DELETE', {}, true);
}

/**
 * List all senders
 *
 */
async function listSenders() {
    return sendRequest('senders', 'GET', {}, true);
}

/**
 * Add new sender
 *
 * @param senderName
 * @param senderEmail
 */
async function addSender(senderName, senderEmail) {
    if ((senderEmail === undefined) || (!senderEmail.length) || (senderName === undefined) || (!senderName.length)) {
        throw new Error('Empty sender name or email');
    }
    var data = {
        email: senderEmail,
        name: senderName
    };
    return sendRequest('senders', 'POST', data, true);
}

/**
 * Remove sender
 *
 * @param senderEmail
 */
async function removeSender(senderEmail) {
    if ((senderEmail === undefined) || (!senderEmail.length)) {
        throw new Error('Empty email');
    }
    var data = {
        email: senderEmail
    };
    return sendRequest('senders', 'DELETE', data, true);
}

/**
 * Activate sender using code
 *
 * @param senderEmail
 * @param code
 */
async function activateSender(senderEmail, code) {
    if ((senderEmail === undefined) || (!senderEmail.length) || (code === undefined) || (!code.length)) {
        throw new Error('Empty email or activation code');
    }
    var data = {
        code: code
    };
    return sendRequest('senders/' + senderEmail + '/code', 'POST', data, true);
}

/**
 * Request mail with activation code
 *
 * @param senderEmail
 */
async function getSenderActivationMail(senderEmail) {
    if ((senderEmail === undefined) || (!senderEmail.length)) {
        throw new Error('Empty email');
    }
    return sendRequest('senders/' + senderEmail + '/code', 'GET', {}, true);
}

/**
 * Get global information about email
 *
 * @param email
 */
async function getEmailGlobalInfo(email) {
    if ((email === undefined) || (!email.length)) {
        throw new Error('Empty email');
    }
    return sendRequest('emails/' + email, 'GET', {}, true);
}

/**
 * Remove email from all books
 *
 * @param email
 */
async function removeEmailFromAllBooks(email) {
    if ((email === undefined) || (!email.length)) {
        throw new Error('Empty email');
    }
    return sendRequest('emails/' + email, 'DELETE', {}, true);
}

/**
 * Get email statistic by all campaigns
 *
 * @param email
 */
async function emailStatByCampaigns(email) {
    if ((email === undefined) || (!email.length)) {
        throw new Error('Empty email');
    }
    return sendRequest('emails/' + email + '/campaigns', 'GET', {}, true);
}

/**
 * Get all emails from blacklist
 *
 */
async function getBlackList() {
    return sendRequest('blacklist', 'GET', {}, true);
}

/**
 * Add email to blacklist
 *
 * @param emails
 * @param comment
 */
async function addToBlackList(emails, comment) {
    if ((emails === undefined) || (!emails.length)) {
        throw new Error('Empty email');
    }
    if (comment === undefined) {
        comment = '';
    }
    var data = {
        emails: base64(emails),
        comment: comment
    };
    return sendRequest('blacklist', 'POST', data, true);
}

/**
 * Remove emails from blacklist
 *
 * @param emails
 */
async function removeFromBlackList(emails) {
    if ((emails === undefined) || (!emails.length)) {
        throw new Error('Empty emails');
    }
    var data = {
        emails: base64(emails),
    };
    return sendRequest('blacklist', 'DELETE', data, true);
}

/**
 * Get balance
 *
 * @param currency
 */
async function getBalance(currency) {
    return sendRequest( currency ? 'balance' : 'balance/' + currency.toUpperCase(), 'GET', {}, true);
}

/**
 * SMTP: get list of emails
 *
 * @param limit
 * @param offset
 * @param fromDate
 * @param toDate
 * @param sender
 * @param recipient
 */
async function smtpListEmails(limit, offset, fromDate, toDate, sender, recipient) {
    if (limit === undefined) {
        limit = 0;
    }
    if (offset === undefined) {
        offset = 0;
    }
    if (fromDate === undefined) {
        fromDate = '';
    }
    if (toDate === undefined) {
        toDate = '';
    }
    if (sender === undefined) {
        sender = '';
    }
    if (recipient === undefined) {
        recipient = '';
    }
    var data = {
        limit: limit,
        offset: offset,
        from: fromDate,
        to: toDate,
        sender: sender,
        recipient: recipient
    };
    return sendRequest('smtp/emails', 'GET', data, true);
}

/**
 * Get information about email by id
 *
 * @param id
 */
async function smtpGetEmailInfoById(id) {
    if ((id === undefined) || (!id.length)) {
        throw new Error('Empty id');
    }
    return sendRequest('smtp/emails/' + id, 'GET', {}, true);
}

/**
 * SMTP: add emails to unsubscribe list
 *
 * @param emails
 */
async function smtpUnsubscribeEmails(emails) {
    if (emails === undefined) {
        throw new Error('Empty emails');
    }
    var data = {
        emails: serialize(emails)
    };
    return sendRequest('smtp/unsubscribe', 'POST', data, true);
}

/**
 * SMTP: remove emails from unsubscribe list
 *
 * @param emails
 */
async function smtpRemoveFromUnsubscribe(emails) {
    if (emails === undefined) {
        throw new Error('Empty emails');
    }
    var data = {
        emails: serialize(emails)
    };
    return sendRequest('smtp/unsubscribe', 'DELETE', data, true);
}

/**
 * Get list of IP
 *
 */
async function smtpListIP() {
    return sendRequest('smtp/ips', 'GET', {}, true);
}

/**
 * SMTP: get list of allowed domains
 *
 */
async function smtpListAllowedDomains() {
    return sendRequest('smtp/domains', 'GET', {}, true);
}

/**
 * SMTP: add new domain
 *
 * @param email
 */
async function smtpAddDomain(email) {
    if ((email === undefined) || (!email.length)) {
        throw new Error('Empty email');
    }
    var data = {
        email: email
    };
    return sendRequest('smtp/domains', 'POST', data, true);
}

/**
 * SMTP: verify domain
 *
 * @param email
 */
async function smtpVerifyDomain(email) {
    if ((email === undefined) || (!email.length)) {
        throw new Error('Empty email');
    }
    return sendRequest('smtp/domains/' + email, 'GET', {}, true);
}

/**
 * SMTP: send mail
 *
 * @param email
 */
async function smtpSendMail(email) {
    if (email === undefined) {
        throw new Error('Empty email data');
    }
    if (email.html)
        email['html'] = base64(email['html']);
    var data = {
        email: serialize(email)
    };
    return sendRequest('smtp/emails', 'POST', data, true);
}


// *********************************  SMS  *********************************

/**
 * Add new phones to address book
 *
 * @param addressbook_id
 * @param phones
 */
async function smsAddPhones(addressbook_id, phones) {
    if ((addressbook_id === undefined) || (phones === undefined) || (!phones.length)) {
        throw new Error('Empty phones or book id');
    }
    var data = {
        addressBookId: addressbook_id,
        phones: JSON.stringify(phones)
    };
    return sendRequest('sms/numbers', 'POST', data, true);
}

/**
 * Add new phones to address book with variables
 *
 * @param addressbook_id
 * @param phones
 */
async function smsAddPhonesWithVariables(addressbook_id, phones) {
    if ((addressbook_id === undefined) || (phones === undefined) || (!Object.keys(phones).length)) {
        throw new Error('Empty phones or book id');
    }
    var data = {
        addressBookId: addressbook_id,
        phones: JSON.stringify(phones)
    };
    return sendRequest('sms/numbers/variables', 'POST', data, true);
}

/**
 * Remove phones from address book
 *
 * @param addressbook_id
 * @param phones
 */
async function smsRemovePhones(addressbook_id, phones) {
    if ((addressbook_id === undefined) || (phones === undefined) || (!phones.length)) {
        throw new Error('Empty phones or book id');
    }
    var data = {
        addressBookId: addressbook_id,
        phones: JSON.stringify(phones)
    };
    return sendRequest('sms/numbers', 'DELETE', data, true);
}

/**
 * Get all phones from blacklist
 *
 */
async function smsGetBlackList() {
    return sendRequest('sms/black_list', 'GET', {}, true);
}

/**
 * Get information about phone from the address book
 *
 * @param addressbook_id
 * @param phone
 */
async function smsGetPhoneInfo(addressbook_id, phone) {
    if ((addressbook_id === undefined) || (phone === undefined)) {
        throw new Error('Empty phone or book id');
    }

    return sendRequest('sms/numbers/info/' + addressbook_id + '/' + phone, 'GET', {}, true);
}

/**
 * Update phones variables from the address book
 *
 * @param addressbook_id
 * @param phones
 * @param variables
 */
async function smsUpdatePhonesVariables(addressbook_id, phones, variables) {
    if (addressbook_id === undefined) {
        throw new Error('Empty book id');
    }
    if ((phones === undefined) || (!phones.length)) {
        throw new Error('Empty phones');
    }
    if ((variables === undefined) || (!Object.keys(variables).length)) {
        throw new Error('Empty variables');
    }
    var data = {
        'addressBookId': addressbook_id,
        'phones': JSON.stringify(phones),
        'variables': JSON.stringify(variables)
    };

    return sendRequest('sms/numbers', 'PUT', data, true);
}

/**
 * Get info by phones from the blacklist
 *
 * @param phones
 */
async function smsGetPhonesInfoFromBlacklist(phones) {
    if ((phones === undefined) || (!phones.length)) {
        throw new Error('Empty phones');
    }
    var data = {
        'phones': JSON.stringify(phones),
    };

    return sendRequest('sms/black_list/by_numbers', 'GET', data, true);
}

/**
 * Add phones to blacklist
 *
 * @param phones
 * @param comment
 */
async function smsAddPhonesToBlacklist(phones, comment) {
    if ((phones === undefined) || (!phones.length)) {
        throw new Error('Empty phones');
    }
    var data = {
        'phones': JSON.stringify(phones),
        'description': comment
    };

    return sendRequest('sms/black_list', 'POST', data, true);
}

/**
 * Remove phones from blacklist
 *
 * @param phones
 */
async function smsDeletePhonesFromBlacklist(phones) {
    if ((phones === undefined) || (!phones.length)) {
        throw new Error('Empty phones');
    }
    var data = {
        'phones': JSON.stringify(phones),
    };

    return sendRequest('sms/black_list', 'DELETE', data, true);
}

/**
 * Create new sms campaign
 *
 * @param sender_name
 * @param addressbook_id
 * @param body
 * @param date
 * @param transliterate
 */
async function smsAddCampaign(sender_name, addressbook_id, body, date, transliterate) {
    if (sender_name === undefined) {
        throw new Error('Empty sender name');
    }
    if (addressbook_id === undefined) {
        throw new Error('Empty book id');
    }
    if (body === undefined) {
        throw new Error('Empty sms text');
    }
    var data = {
        'sender': sender_name,
        'addressBookId': addressbook_id,
        'body': body,
        'date': date,
        'transliterate': transliterate
    };

    return sendRequest('sms/campaigns', 'POST', data, true);
}

/**
 * Send sms by some phones
 *
 * @param sender_name
 * @param phones
 * @param body
 * @param date
 * @param transliterate
 * @param route
 */
async function smsSend(sender_name, phones, body, date, transliterate, route) {
    if (sender_name === undefined) {
        throw new Error('Empty sender name');
    }
    if ((phones === undefined) || (!phones.length)) {
        throw new Error('Empty phones');
    }
    if (body === undefined) {
        throw new Error('Empty sms text');
    }
    var data = {
        'sender': sender_name,
        'phones': JSON.stringify(phones),
        'body': body,
        'date': date,
        'transliterate': transliterate,
        'route': route
    };

    return sendRequest('sms/send', 'POST', data, true);
}

/**
 * Get list of campaigns
 *
 * @param date_from
 * @param date_to
 */
async function smsGetListCampaigns(date_from, date_to) {
    var data = {
        'dateFrom': date_from,
        'dateTo': date_to
    };

    return sendRequest('sms/campaigns/list', 'GET', data, true);
}

/**
 * Get information about sms campaign
 *
 * @param campaign_id
 */
async function smsGetCampaignInfo(campaign_id) {
    if (campaign_id === undefined) {
        throw new Error('Empty sms campaign id');
    }

    return sendRequest('sms/campaigns/info/' + campaign_id, 'GET', {}, true);
}

/**
 * Cancel sms campaign
 *
 * @param campaign_id
 */
async function smsCancelCampaign(campaign_id) {
    if (campaign_id === undefined) {
        throw new Error('Empty sms campaign id');
    }

    return sendRequest('sms/campaigns/cancel/' + campaign_id, 'PUT', {}, true);
}

/**
 * Get cost sms campaign
 *
 * @param sender
 * @param body
 * @param addressbook_id
 * @param phones
 */
async function smsGetCampaignCost(sender_name, body, addressbook_id, phones) {
    if (sender_name === undefined) {
        throw new Error('Empty sender name');
    }
    if (body === undefined) {
        throw new Error('Empty sms text');
    }
    if ((addressbook_id === undefined) || (phones === undefined) || (!phones.length)) {
        throw new Error('Empty book id or phones');
    }
    var data = {
        'sender': sender_name,
        'body': body,
        'addressBookId': addressbook_id
    };
    if (phones.length) {
        data['phones'] = JSON.stringify(phones);
    }

    return sendRequest('sms/campaigns/cost', 'GET', data, true);
}

/**
 * Remove sms campaign
 *
 * @param campaign_id
 */
async function smsDeleteCampaign(campaign_id) {
    if (campaign_id === undefined) {
        throw new Error('Empty sms campaign id');
    }
    var data = {
        'id': campaign_id
    };
    return sendRequest('sms/campaigns', 'DELETE', data, true);
}

/**
 * Send row request to RestAPI
 *
 * @param path
 * @param method
 * @param data
 */
async function sendRawRequest(path, method, data = {}) {
    if (!['POST', 'GET', 'DELETE', 'PUT', 'PATCH'].includes(method)) {
        throw new Error('Unknown method: ' + method);
    }

    return sendRequest(path, method, data, true);
}

exports.init = init;
exports.listAddressBooks = listAddressBooks;
exports.createAddressBook = createAddressBook;
exports.editAddressBook = editAddressBook;
exports.removeAddressBook = removeAddressBook;
exports.listEmailTemplates = listEmailTemplates;
exports.getEmailTemplate = getEmailTemplate;
exports.getBookInfo = getBookInfo;
exports.getEmailsFromBook = getEmailsFromBook;
exports.addEmails = addEmails;
exports.removeEmails = removeEmails;
exports.getEmailInfo = getEmailInfo;
exports.updateEmailVariables = updateEmailVariables;
exports.campaignCost = campaignCost;
exports.listCampaigns = listCampaigns;
exports.getCampaignInfo = getCampaignInfo;
exports.campaignStatByCountries = campaignStatByCountries;
exports.campaignStatByReferrals = campaignStatByReferrals;
exports.createCampaign = createCampaign;
exports.cancelCampaign = cancelCampaign;
exports.listSenders = listSenders;
exports.addSender = addSender;
exports.removeSender = removeSender;
exports.activateSender = activateSender;
exports.getSenderActivationMail = getSenderActivationMail;
exports.getEmailGlobalInfo = getEmailGlobalInfo;
exports.removeEmailFromAllBooks = removeEmailFromAllBooks;
exports.emailStatByCampaigns = emailStatByCampaigns;
exports.getBlackList = getBlackList;
exports.addToBlackList = addToBlackList;
exports.removeFromBlackList = removeFromBlackList;
exports.getBalance = getBalance;
exports.smtpListEmails = smtpListEmails;
exports.smtpGetEmailInfoById = smtpGetEmailInfoById;
exports.smtpUnsubscribeEmails = smtpUnsubscribeEmails;
exports.smtpRemoveFromUnsubscribe = smtpRemoveFromUnsubscribe;
exports.smtpListIP = smtpListIP;
exports.smtpListAllowedDomains = smtpListAllowedDomains;
exports.smtpAddDomain = smtpAddDomain;
exports.smtpVerifyDomain = smtpVerifyDomain;
exports.smtpSendMail = smtpSendMail;
exports.smsGetBlackList = smsGetBlackList;
exports.smsAddPhones = smsAddPhones;
exports.smsAddPhonesWithVariables = smsAddPhonesWithVariables;
exports.smsRemovePhones = smsRemovePhones;
exports.smsGetPhoneInfo = smsGetPhoneInfo;
exports.smsUpdatePhonesVariables = smsUpdatePhonesVariables;
exports.smsGetPhonesInfoFromBlacklist = smsGetPhonesInfoFromBlacklist;
exports.smsAddPhonesToBlacklist = smsAddPhonesToBlacklist;
exports.smsDeletePhonesFromBlacklist = smsDeletePhonesFromBlacklist;
exports.smsAddCampaign = smsAddCampaign;
exports.smsSend = smsSend;
exports.smsGetListCampaigns = smsGetListCampaigns;
exports.smsGetCampaignInfo = smsGetCampaignInfo;
exports.smsCancelCampaign = smsCancelCampaign;
exports.smsGetCampaignCost = smsGetCampaignCost;
exports.smsDeleteCampaign = smsDeleteCampaign;
exports.getToken = getToken;
exports.sendRequest = sendRawRequest;
