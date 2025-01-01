import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { MailQueue } from './mail-queue';
import { EmailRenderer } from './email-renderer';

/**
* System for handling email functionality
* @class EmailManager
*/
export default class EmailManager {
    /**
    * @private instance - The singleton instance of EmailManager
    * @private transporter - The nodemailer transporter for sending emails
    * @private queue - The mail queue for handling email sending
    * @private config - The configuration for the mail system
    * @private enabled - Whether the mail system is enabled
    * @private isValid - Whether the mail system is valid
    */
    private static instance: EmailManager | null = null;
    private transporter!: Transporter;
    private queue!: MailQueue;
    private config!: MailModule.MailConfig;
    public enabled!: boolean;
    public isValid: boolean = false;

    private constructor() {
        // Private constructor for Singleton
    }

    /**
    * Initialize the EmailManager with config
    * @param config - Mail configuration
    * @param enabled - Whether the mail system is enabled
    */
    public static initialize(config: MailModule.MailConfig): void {
        if (!EmailManager.instance) {
            EmailManager.instance = new EmailManager();
        }
        EmailManager.instance.updateConfig(config);
    }

    /**
    * Get the singleton instance of EmailManager
    * @returns {EmailManager} The singleton instance
    * @throws {Error} If EmailManager hasn't been initialized
    */
    public static getInstance(): EmailManager {
        if (!EmailManager.instance) {
            throw new Error('EmailManager needs to be initialized first. Call EmailManager.initialize()');
        }
        return EmailManager.instance;
    }

    /**
    * Update mail system configuration at runtime
    * @param config - New mail configuration
    */
    public updateConfig(config: MailModule.MailConfig): void {
        this.config = config;
        this.enabled = config.enabled;
        
        try {
            // Close existing transporter if it exists
            if (this.transporter) {
                this.transporter.close();
            }

            // Create new transporter with updated config
            this.transporter = nodemailer.createTransport(config.smtp);
            
            // Verify SMTP connection
            this.transporter.verify((error) => {
                if (error) {
                    console.warn('SMTP Connection Error:', error.message);
                    this.isValid = false;
                } else {
                    this.isValid = true;
                }
            });

            // Update or create new queue with new settings
            if (this.queue) {
                this.queue.clear();
            }
            this.queue = new MailQueue(config.queueSettings);
            
            this.setupQueueListeners();
        } catch (error) {
            console.warn('Email configuration error:', error);
            this.isValid = false;
        }
    }

    /**
    * Get current mail configuration
    * @returns {MailModule.MailConfig} Current configuration
    */
    public getConfig(): MailModule.MailConfig {
        return { ...this.config };
    }

    /**
    * Validate the attachments of an email
    * @param attachments - The attachments to validate
    */
    private validateAttachments(attachments?: MailModule.MailOptions['attachments']): void {
        if (!attachments?.length) {
            return;
        }

        const maxSize = this.config.attachments?.maxSize || 10 * 1024 * 1024; // Default 10MB

        for (const attachment of attachments) {
            // Check size
            if (attachment.content instanceof Buffer) {
                if (attachment.content.length > maxSize) {
                    throw new Error(`Attachment ${attachment.filename} exceeds maximum size of ${maxSize} bytes`);
                }
            }

        }
    }

    /**
    * Setup the queue listeners for the mail system
    */
    private setupQueueListeners(): void {
        this.queue.on('mail:process', async (mail: MailModule.QueuedMail) => {
            await this.transporter.sendMail({
                ...mail,
                from: mail.from || this.config.defaultFrom
            });
        });

        this.queue.on('queue:empty', () => {
            this.destroy();
        });
    }

    /**
    * Send an email
    * @param options - The options for the email
    * @returns {Promise<string>} The ID of the queued email
    * @throws {Error} If mail system is disabled
    */
    async sendMail(options: MailModule.MailOptions): Promise<string | void> {
        if (!this.enabled || !this.isValid) {
            console.warn("Mail system is disabled or not properly configured");
            return;
        }
        this.validateAttachments(options.attachments);
        if (options.Template && options.templateProps) {
            const html = await EmailRenderer.renderTemplate(options.Template, options.templateProps);
            options = { ...options, html };
            delete options.Template;
            delete options.templateProps;
        }
        return this.queue.add(options);
    }

    /**
    * Send multiple emails
    * @param options - The options for the emails
    * @returns {Promise<string[]>} The IDs of the queued emails
    * @throws {Error} If mail system is disabled
    */
    async sendBulk(options: MailModule.MailOptions[]): Promise<string[] | void> {
        if (!this.enabled) {
            console.warn("Mail system is disabled");
            return;
        }
        const processedOptions = await Promise.all(options.map(async (opt) => {
            this.validateAttachments(opt.attachments);
            if (opt.Template && opt.templateProps) {
                const html = await EmailRenderer.renderTemplate(opt.Template, opt.templateProps);
                opt = { ...opt, html };
                delete opt.Template;
                delete opt.templateProps;
            }
            return opt;
        }));
        return this.queue.addBulk(processedOptions);
    }

    /**
    * Get the status of a queued email
    * @param id - The ID of the queued email
    * @returns {MailModule.QueuedMail | undefined} The status of the queued email or undefined if not found
    */
    getMailStatus(id: string): MailModule.QueuedMail | undefined {
        return this.queue.getStatus(id);
    }

    /**
    * Destroy the mail system
    */
    async destroy(): Promise<void> {
        this.queue.clear()
        this.transporter.close();
    }

} 