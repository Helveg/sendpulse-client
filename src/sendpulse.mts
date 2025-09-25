/*
 * Sendpulse REST API Node.js class (TypeScript ESM)
 *
 * Documentation
 * https://login.sendpulse.com/manual/rest-api/
 * https://sendpulse.com/api
 */

import axios from 'axios';
import { base64, serializeArray } from './util.mjs';

interface TokenData {
  access_token: string;
  expires_at: number;
}

export class SendPulseClient {
  private token?: TokenData;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string = '',
    private readonly apiUrl = 'https://api.sendpulse.com'
  ) {}

  /**
   * Form and send request to API service
   */
  async sendRequest(
    path: string,
    method: string = 'POST',
    data: any,
    useToken: boolean
  ): Promise<any> {
    const headers: Record<string, any> = {};
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));

    if (useToken) {
      if (!this.token || Date.now() >= this.token.expires_at)
        await this.getToken();
      headers['Authorization'] = 'Bearer ' + this.token.access_token;
    }

    return (
      await axios.request({
        method,
        url: new URL(path, this.apiUrl).href,
        data,
        headers,
      })
    ).data;
  }

  /**
   * Get token and store it
   */

  async getToken(): Promise<void> {
    const data = await this.sendRequest(
      'oauth/access_token',
      'POST',
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
      false
    );
    this.token = {
      access_token: data.access_token,
      // Store the expiration time of the token, minus 60 seconds to be sure.
      expires_at: Date.now() + (data.expires_in - 60) * 1000,
    };
  }

  /**
   * List of address books
   */

  async listAddressBooks(): Promise<any> {
    return this.sendRequest('addressbooks', 'GET', {}, true);
  }

  /**
   * Create new address book
   */

  async createAddressBook(book_name: string): Promise<any> {
    if (book_name === undefined) {
      throw new Error('Empty book name');
    }
    const data = { name: book_name };
    return this.sendRequest('addressbooks', 'POST', data, true);
  }

  /**
   * Edit address book
   */

  async editAddressBook(id: string, new_name: string): Promise<any> {
    if (id === undefined || new_name === undefined) {
      throw new Error('Empty book id or new name');
    }
    const data = { id, name: new_name };
    return this.sendRequest('addressbooks', 'PUT', data, true);
  }

  /**
   * Remove address book
   */

  async removeAddressBook(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty book id');
    }
    const data = { id };
    return this.sendRequest('addressbooks', 'DELETE', data, true);
  }

  /**
   * List email templates
   */

  async listEmailTemplates(): Promise<any> {
    return this.sendRequest('template', 'GET', {}, true);
  }

  /**
   * Get email template
   */

  async getEmailTemplate(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty template id');
    }
    const data = { id };
    return this.sendRequest('template', 'GET', data, true);
  }

  /**
   * Get book info
   */

  async getBookInfo(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty book id');
    }
    const data = { id };
    return this.sendRequest('addressbooks/info', 'GET', data, true);
  }

  /**
   * Get emails from book
   */

  async getAddressBookEmails(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty book id');
    }
    const data = { id };
    return this.sendRequest('addressbooks/emails', 'GET', data, true);
  }

  /**
   * Add address book emails
   */
  async addAddressBookEmails(book_id: string, emails: any[]): Promise<any> {
    if (book_id === undefined || emails === undefined) {
      throw new Error('Empty book id or emails');
    }
    const data: Record<string, any> = { addressBookId: book_id };
    if (emails.length) {
      data['emails'] = JSON.stringify(emails);
    }
    return this.sendRequest('addressbooks/emails', 'POST', data, true);
  }

  /**
   * Remove address book emails
   */
  async removeAddressBookEmails(
    book_id: string,
    emails: string[]
  ): Promise<any> {
    if (book_id === undefined || emails === undefined) {
      throw new Error('Empty book id or emails');
    }
    const data: Record<string, any> = { addressBookId: book_id };
    if (emails.length) {
      data['emails'] = JSON.stringify(emails);
    }
    return this.sendRequest('addressbooks/emails', 'DELETE', data, true);
  }

  /**
   * Get email info
   */

  async getEmailInfo(email: string): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty email');
    }
    const data = { email };
    return this.sendRequest('emails/' + base64(email), 'GET', data, true);
  }

  /**
   * Update email variables
   */

  async updateEmailVariables(
    book_id: string,
    email: string,
    variables: Record<string, any>
  ): Promise<any> {
    if (
      book_id === undefined ||
      email === undefined ||
      variables === undefined
    ) {
      throw new Error('Empty book id or email or variables');
    }
    const data: Record<string, any> = {
      addressBookId: book_id,
      email,
      variables,
    };
    return this.sendRequest('addressbooks/emails/variable', 'PUT', data, true);
  }

  /**
   * Get campaigns cost
   */

  async campaignCost(
    name: string,
    subject: string,
    from: string,
    from_name: string,
    body: string,
    book_id: string,
    emails: string[]
  ): Promise<any> {
    if (name === undefined || subject === undefined) {
      throw new Error('Empty campaign name or subject');
    }
    if (from === undefined || from_name === undefined) {
      throw new Error('Empty sender credentials');
    }
    if (book_id === undefined && emails === undefined) {
      throw new Error('Empty book id and emails array');
    }
    const data: Record<string, any> = {
      name,
      subject,
      from,
      fromName: from_name,
      body,
    };
    if (book_id !== undefined) {
      data['addressBookId'] = book_id;
    }
    if (emails !== undefined && emails.length) {
      data['emails'] = JSON.stringify(emails);
    }
    return this.sendRequest('campaigns', 'GET', data, true);
  }

  /**
   * List campaigns
   */

  async listCampaigns(limit?: number, offset?: number): Promise<any> {
    const data: Record<string, any> = {};
    if (limit !== undefined) data['limit'] = limit;
    if (offset !== undefined) data['offset'] = offset;
    return this.sendRequest('campaigns', 'GET', data, true);
  }

  /**
   * Get campaign info
   */

  async getCampaignInfo(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty campaign id');
    }
    const data = { id };
    return this.sendRequest('campaigns/' + id, 'GET', data, true);
  }

  /**
   * Campaign stat by countries
   */

  async campaignStatByCountries(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty campaign id');
    }
    const data = { id };
    return this.sendRequest(
      'campaigns/' + id + '/countries',
      'GET',
      data,
      true
    );
  }

  /**
   * Campaign stat by referrals
   */

  async campaignStatByReferrals(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty campaign id');
    }
    const data = { id };
    return this.sendRequest(
      'campaigns/' + id + '/referrals',
      'GET',
      data,
      true
    );
  }

  /**
   * Create campaign
   */

  async createCampaign(
    name: string,
    subject: string,
    from: string,
    from_name: string,
    body: string,
    book_id?: string,
    emails?: string[]
  ): Promise<any> {
    if (name === undefined || subject === undefined) {
      throw new Error('Empty campaign name or subject');
    }
    if (from === undefined || from_name === undefined) {
      throw new Error('Empty sender credentials');
    }
    if (book_id === undefined && emails === undefined) {
      throw new Error('Empty book id and emails array');
    }
    const data: Record<string, any> = {
      name,
      subject,
      from,
      fromName: from_name,
      body,
    };
    if (book_id !== undefined) data['addressBookId'] = book_id;
    if (emails !== undefined && emails.length)
      data['emails'] = JSON.stringify(emails);
    return this.sendRequest('campaigns', 'POST', data, true);
  }

  /**
   * Cancel campaign
   */

  async cancelCampaign(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty campaign id');
    }
    const data = { id };
    return this.sendRequest('campaigns', 'DELETE', data, true);
  }

  /**
   * List senders
   */

  async listSenders(): Promise<any> {
    return this.sendRequest('senders', 'GET', {}, true);
  }

  /**
   * Add sender
   */

  async addSender(email: string, name: string): Promise<any> {
    if (email === undefined || name === undefined) {
      throw new Error('Empty sender email or name');
    }
    const data = { email, name };
    return this.sendRequest('senders', 'POST', data, true);
  }

  /**
   * Remove sender
   */

  async removeSender(email: string): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty sender email');
    }
    const data = { email };
    return this.sendRequest('senders', 'DELETE', data, true);
  }

  /**
   * Activate sender
   */

  async activateSender(email: string, code: string): Promise<any> {
    if (email === undefined || code === undefined) {
      throw new Error('Empty sender email or activation code');
    }
    const data = { email, code };
    return this.sendRequest('senders/activate', 'POST', data, true);
  }

  /**
   * Get sender activation mail
   */

  async getSenderActivationMail(email: string): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty sender email');
    }
    const data = { email };
    return this.sendRequest('senders/activationMail', 'POST', data, true);
  }

  /**
   * Get email global info
   */

  async getEmailGlobalInfo(email: string): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty email');
    }
    const data = { email };
    return this.sendRequest('emails/' + base64(email), 'GET', data, true);
  }

  /**
   * Remove email from all books
   */

  async removeEmailFromAllBooks(email: string): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty email');
    }
    const data = { email };
    return this.sendRequest('emails/' + base64(email), 'DELETE', data, true);
  }

  /**
   * Email stat by campaigns
   */

  async emailStatByCampaigns(email: string): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty email');
    }
    const data = { email };
    return this.sendRequest(
      'emails/' + base64(email) + '/campaigns',
      'GET',
      data,
      true
    );
  }

  /**
   * Get black list
   */

  async getBlackList(): Promise<any> {
    return this.sendRequest('blacklist', 'GET', {}, true);
  }

  /**
   * Add to black list
   */

  async addToBlackList(
    emails: string[] | string,
    comment?: string
  ): Promise<any> {
    if (emails === undefined) {
      throw new Error('Empty email');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(emails) && emails.length) {
      data['emails'] = JSON.stringify(emails);
    } else if (typeof emails === 'string') {
      data['emails'] = JSON.stringify([emails]);
    }
    if (comment !== undefined) {
      data['comment'] = comment;
    }
    return this.sendRequest('blacklist', 'POST', data, true);
  }

  /**
   * Remove from black list
   */

  async removeFromBlackList(emails: string[] | string): Promise<any> {
    if (emails === undefined) {
      throw new Error('Empty email');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(emails) && emails.length) {
      data['emails'] = JSON.stringify(emails);
    } else if (typeof emails === 'string') {
      data['emails'] = JSON.stringify([emails]);
    }
    return this.sendRequest('blacklist', 'DELETE', data, true);
  }

  /**
   * Get current balance
   */

  async getBalance(currency?: string): Promise<any> {
    const data: Record<string, any> = {};
    if (currency !== undefined) {
      data['currency'] = currency;
    }
    return this.sendRequest('balance', 'GET', data, true);
  }

  /**
   * List of emails sent via SMTP
   */

  async smtpListEmails(
    limit?: number,
    offset?: number,
    from?: string,
    to?: string
  ): Promise<any> {
    const data: Record<string, any> = {};
    if (limit !== undefined) data['limit'] = limit;
    if (offset !== undefined) data['offset'] = offset;
    if (from !== undefined) data['from'] = from;
    if (to !== undefined) data['to'] = to;
    return this.sendRequest('smtp/emails', 'GET', data, true);
  }

  /**
   * Get info by email id
   */

  async smtpGetEmailInfoById(id: string): Promise<any> {
    if (id === undefined) {
      throw new Error('Empty email id');
    }
    const data = { id };
    return this.sendRequest('smtp/emails/' + id, 'GET', data, true);
  }

  /**
   * Unsubscribe emails using SMTP
   */

  async smtpUnsubscribeEmails(emails: string[] | string): Promise<any> {
    if (emails === undefined) {
      throw new Error('Empty email');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(emails) && emails.length) {
      data['emails'] = JSON.stringify(emails);
    } else if (typeof emails === 'string') {
      data['emails'] = JSON.stringify([emails]);
    }
    return this.sendRequest('smtp/unsubscribe', 'POST', data, true);
  }

  /**
   * Remove email from unsubscribe list using SMTP
   */

  async smtpRemoveFromUnsubscribe(emails: string[] | string): Promise<any> {
    if (emails === undefined) {
      throw new Error('Empty email');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(emails) && emails.length) {
      data['emails'] = JSON.stringify(emails);
    } else if (typeof emails === 'string') {
      data['emails'] = JSON.stringify([emails]);
    }
    return this.sendRequest('smtp/unsubscribe', 'DELETE', data, true);
  }

  /**
   * List IPs
   */

  async smtpListIP(): Promise<any> {
    return this.sendRequest('smtp/ips', 'GET', {}, true);
  }

  /**
   * List allowed domains
   */

  async smtpListAllowedDomains(): Promise<any> {
    return this.sendRequest('smtp/domains', 'GET', {}, true);
  }

  /**
   * Add domain
   */

  async smtpAddDomain(email: string): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty domain name');
    }
    const data = { email };
    return this.sendRequest('smtp/domains', 'POST', data, true);
  }

  /**
   * Verify domain
   */

  async smtpVerifyDomain(email: string): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty domain name');
    }
    const data = { email };
    return this.sendRequest('smtp/domains/verify', 'POST', data, true);
  }

  /**
   * Send mail
   */

  async smtpSendMail(email: Record<string, any>): Promise<any> {
    if (email === undefined) {
      throw new Error('Empty email data');
    }
    const data: Record<string, any> = {};
    for (const key in email) {
      if (!Object.prototype.hasOwnProperty.call(email, key)) continue;
      let _name = key;
      if (key === 'html' || key === 'text') {
        _name = key + '_body';
      } else if (key === 'subject') {
        _name = 'subj';
      }
      const _data = email[key];
      if (typeof _data === 'object' && _data !== null) {
        Object.assign(data, serializeArray(_data, _name));
      } else {
        data[_name] = _data;
      }
    }
    return this.sendRequest('smtp/emails', 'POST', data, true);
  }

  /**
   * Get sms blacklist
   */

  async smsGetBlackList(): Promise<any> {
    return this.sendRequest('sms/black_list/list', 'GET', {}, true);
  }

  /**
   * Add phones to sms blacklist
   */

  async smsAddPhones(
    phones: string[] | string,
    comment?: string
  ): Promise<any> {
    if (phones === undefined) {
      throw new Error('Empty phones');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(phones) && phones.length) {
      data['phones'] = JSON.stringify(phones);
    } else if (typeof phones === 'string') {
      data['phones'] = JSON.stringify([phones]);
    }
    if (comment !== undefined) {
      data['comment'] = comment;
    }
    return this.sendRequest('sms/black_list/add', 'POST', data, true);
  }

  /**
   * Add phones with variables to sms blacklist
   */

  async smsAddPhonesWithVariables(phones: any[]): Promise<any> {
    if (phones === undefined) {
      throw new Error('Empty phones');
    }
    const data: Record<string, any> = {};
    if (phones.length) {
      data['phones'] = JSON.stringify(phones);
    }
    return this.sendRequest('sms/black_list/add', 'POST', data, true);
  }

  /**
   * Remove phones from sms blacklist
   */

  async smsRemovePhones(phones: string[] | string): Promise<any> {
    if (phones === undefined) {
      throw new Error('Empty phones');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(phones) && phones.length) {
      data['phones'] = JSON.stringify(phones);
    } else if (typeof phones === 'string') {
      data['phones'] = JSON.stringify([phones]);
    }
    return this.sendRequest('sms/black_list/remove', 'POST', data, true);
  }

  /**
   * Get phone info from sms blacklist
   */

  async smsGetPhoneInfo(phone: string): Promise<any> {
    if (phone === undefined) {
      throw new Error('Empty phone');
    }
    const data = { phone };
    return this.sendRequest('sms/black_list/info', 'GET', data, true);
  }

  /**
   * Update phones variables in sms blacklist
   */

  async smsUpdatePhonesVariables(phones: any[]): Promise<any> {
    if (phones === undefined) {
      throw new Error('Empty phones');
    }
    const data: Record<string, any> = {};
    if (phones.length) {
      data['phones'] = JSON.stringify(phones);
    }
    return this.sendRequest('sms/black_list/edit', 'POST', data, true);
  }

  /**
   * Get phones info from sms blacklist
   */

  async smsGetPhonesInfoFromBlacklist(phones: string[] | string): Promise<any> {
    if (phones === undefined) {
      throw new Error('Empty phones');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(phones) && phones.length) {
      data['phones'] = JSON.stringify(phones);
    } else if (typeof phones === 'string') {
      data['phones'] = JSON.stringify([phones]);
    }
    return this.sendRequest('sms/black_list/check', 'POST', data, true);
  }

  /**
   * Add phones to sms blacklist
   */

  async smsAddPhonesToBlacklist(phones: string[] | string): Promise<any> {
    if (phones === undefined) {
      throw new Error('Empty phones');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(phones) && phones.length) {
      data['phones'] = JSON.stringify(phones);
    } else if (typeof phones === 'string') {
      data['phones'] = JSON.stringify([phones]);
    }
    return this.sendRequest('sms/black_list/add', 'POST', data, true);
  }

  /**
   * Delete phones from sms blacklist
   */

  async smsDeletePhonesFromBlacklist(phones: string[] | string): Promise<any> {
    if (phones === undefined) {
      throw new Error('Empty phones');
    }
    const data: Record<string, any> = {};
    if (Array.isArray(phones) && phones.length) {
      data['phones'] = JSON.stringify(phones);
    } else if (typeof phones === 'string') {
      data['phones'] = JSON.stringify([phones]);
    }
    return this.sendRequest('sms/black_list/delete', 'POST', data, true);
  }

  /**
   * Add sms campaign
   */

  async smsAddCampaign(
    sender_name: string,
    body: string,
    addressbook_id: string,
    phones: string[]
  ): Promise<any> {
    if (sender_name === undefined) {
      throw new Error('Empty sender name');
    }
    if (body === undefined) {
      throw new Error('Empty sms text');
    }
    if (
      addressbook_id === undefined ||
      phones === undefined ||
      !phones.length
    ) {
      throw new Error('Empty book id or phones');
    }
    const data: Record<string, any> = {
      sender: sender_name,
      body: body,
      addressBookId: addressbook_id,
    };
    if (phones.length) {
      data['phones'] = JSON.stringify(phones);
    }
    return this.sendRequest('sms/campaigns', 'POST', data, true);
  }

  /**
   * Send sms
   */

  async smsSend(
    sender_name: string,
    body: string,
    addressbook_id: string,
    phones: string[]
  ): Promise<any> {
    if (sender_name === undefined) {
      throw new Error('Empty sender name');
    }
    if (body === undefined) {
      throw new Error('Empty sms text');
    }
    if (addressbook_id === undefined && phones === undefined) {
      throw new Error('Empty book id and phones array');
    }
    const data: Record<string, any> = {
      sender: sender_name,
      body: body,
    };
    if (addressbook_id !== undefined) data['addressBookId'] = addressbook_id;
    if (phones !== undefined && phones.length)
      data['phones'] = JSON.stringify(phones);
    return this.sendRequest('sms/send', 'POST', data, true);
  }

  /**
   * Get sms list campaigns
   */

  async smsGetListCampaigns(limit?: number, offset?: number): Promise<any> {
    const data: Record<string, any> = {};
    if (limit !== undefined) data['limit'] = limit;
    if (offset !== undefined) data['offset'] = offset;
    return this.sendRequest('sms/campaigns', 'GET', data, true);
  }

  /**
   * Get sms campaign info by id
   */

  async smsGetCampaignInfo(campaign_id: string): Promise<any> {
    if (campaign_id === undefined) {
      throw new Error('Empty sms campaign id');
    }
    const data = { id: campaign_id };
    return this.sendRequest('sms/campaigns/info', 'GET', data, true);
  }

  /**
   * Cancel sms campaign
   */

  async smsCancelCampaign(campaign_id: string): Promise<any> {
    if (campaign_id === undefined) {
      throw new Error('Empty sms campaign id');
    }
    const data = { id: campaign_id };
    return this.sendRequest('sms/campaigns/cancel', 'POST', data, true);
  }

  /**
   * Get cost sms campaign
   */

  async smsGetCampaignCost(
    sender_name: string,
    body: string,
    addressbook_id: string,
    phones: string[]
  ): Promise<any> {
    if (sender_name === undefined) {
      throw new Error('Empty sender name');
    }
    if (body === undefined) {
      throw new Error('Empty sms text');
    }
    if (
      addressbook_id === undefined ||
      phones === undefined ||
      !phones.length
    ) {
      throw new Error('Empty book id or phones');
    }
    const data: Record<string, any> = {
      sender: sender_name,
      body: body,
      addressBookId: addressbook_id,
    };
    if (phones.length) {
      data['phones'] = JSON.stringify(phones);
    }
    return this.sendRequest('sms/campaigns/cost', 'GET', data, true);
  }

  /**
   * Remove sms campaign
   */

  async smsDeleteCampaign(campaign_id: string): Promise<any> {
    if (campaign_id === undefined) {
      throw new Error('Empty sms campaign id');
    }
    const data = { id: campaign_id };
    return this.sendRequest('sms/campaigns', 'DELETE', data, true);
  }

  /**
   * Send raw request to RestAPI
   */

  async sendRequestRaw(
    path: string,
    method: 'POST' | 'GET' | 'DELETE' | 'PUT' | 'PATCH',
    data: any = {}
  ): Promise<any> {
    if (!['POST', 'GET', 'DELETE', 'PUT', 'PATCH'].includes(method)) {
      throw new Error('Unknown method: ' + method);
    }
    return this.sendRequest(path, method, data, true);
  }
}
