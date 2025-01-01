import { logger } from "../../../app";
import { Job } from "../../../global/libs/jobs/decorators";
import { cleanUnusedActivationTokens } from "./dal";

export class SignJobs {

    @Job({name: 'clean-unused-activation-tokens', cronExpression: '0 0 * * *'})
    async cleanUnusedActivationTokens() {
        const tokens = await cleanUnusedActivationTokens();
        if (!tokens.success) {
            logger.log(`Failed to clean unused activation tokens with error: ${tokens.error}`, 'error');
        } else {
            logger.log(`Successfully cleaned unused ${tokens.metadata?.affectedRows} activation tokens`, 'info');
        }
    }
}