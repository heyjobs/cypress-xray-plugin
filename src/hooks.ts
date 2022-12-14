import {
    ENV_XRAY_API_TOKEN,
    ENV_XRAY_API_URL,
    ENV_XRAY_CLIENT_ID,
    ENV_XRAY_CLIENT_SECRET,
    ENV_XRAY_PASSWORD,
    ENV_XRAY_PROJECT_KEY,
    ENV_XRAY_USERNAME,
} from "./constants";
import { UploadContext } from "./context";
import {
    BasicAuthCredentials,
    JWTCredentials,
    PATCredentials,
} from "./credentials";
import { CloudAPIUploader } from "./uploader/cloudAPI";
import { ServerAPIUploader } from "./uploader/serverAPI";
import { validateConfiguration } from "./util/config";

export async function beforeRunHook(runDetails: Cypress.BeforeRunDetails) {
    UploadContext.ENV = runDetails.config.env;
    validateConfiguration();
    if (
        UploadContext.ENV[ENV_XRAY_CLIENT_ID] &&
        UploadContext.ENV[ENV_XRAY_CLIENT_SECRET]
    ) {
        UploadContext.UPLOADER = new CloudAPIUploader(
            new JWTCredentials(
                UploadContext.ENV[ENV_XRAY_CLIENT_ID],
                UploadContext.ENV[ENV_XRAY_CLIENT_SECRET]
            ),
            UploadContext.ENV[ENV_XRAY_PROJECT_KEY]
        );
    } else if (
        UploadContext.ENV[ENV_XRAY_API_TOKEN] &&
        UploadContext.ENV[ENV_XRAY_API_URL]
    ) {
        UploadContext.UPLOADER = new ServerAPIUploader(
            UploadContext.ENV[ENV_XRAY_API_URL],
            new PATCredentials(UploadContext.ENV[ENV_XRAY_API_TOKEN]),
            UploadContext.ENV[ENV_XRAY_PROJECT_KEY]
        );
    } else if (
        UploadContext.ENV[ENV_XRAY_USERNAME] &&
        UploadContext.ENV[ENV_XRAY_PASSWORD] &&
        UploadContext.ENV[ENV_XRAY_API_URL]
    ) {
        UploadContext.UPLOADER = new ServerAPIUploader(
            UploadContext.ENV[ENV_XRAY_API_URL],
            new BasicAuthCredentials(
                UploadContext.ENV[ENV_XRAY_USERNAME],
                UploadContext.ENV[ENV_XRAY_PASSWORD]
            ),
            UploadContext.ENV[ENV_XRAY_PROJECT_KEY]
        );
    } else {
        throw new Error(
            "Failed to configure Jira Xray uploader: no viable Xray configuration was found or the configuration you provided is not supported.\n" +
                "You can find all configurations that are currently supported at https://github.com/Qytera-Gmbh/cypress-xray-plugin#authentication"
        );
    }
}

export async function afterRunHook(
    results:
        | CypressCommandLine.CypressRunResult
        | CypressCommandLine.CypressFailedRunResult
) {
    if (results.status === "failed") {
        console.error(
            `Failed to run ${results.failures} tests:`,
            results.message
        );
        return;
    }
    console.log("┌───────────────────────────┐");
    console.log("│                           │");
    console.log("│    Cypress Xray Plugin    │");
    console.log("│                           │");
    console.log("└───────────────────────────┘");
    await UploadContext.UPLOADER.uploadResults(
        results as CypressCommandLine.CypressRunResult
    );
}
