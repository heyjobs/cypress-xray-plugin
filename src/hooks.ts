import { CONTEXT } from "./context";
import { issuesByScenario } from "./cucumber/tagging";
import { error, log } from "./logging/logging";
import { parseEnvironmentVariables } from "./util/config";
import { parseFeatureFile } from "./util/parsing";

export async function beforeRunHook(runDetails: Cypress.BeforeRunDetails) {
    if (!CONTEXT) {
        throw new Error(
            "Xray plugin misconfiguration: no configuration found." +
                " Make sure your project has been set up correctly: https://qytera-gmbh.github.io/projects/cypress-xray-plugin/section/configuration/introduction/"
        );
    }
    parseEnvironmentVariables(runDetails.config.env);
    if (!CONTEXT.config.jira.projectKey) {
        throw new Error(
            "Xray plugin misconfiguration: Jira project key was not set"
        );
    }
}

export async function afterRunHook(
    results:
        | CypressCommandLine.CypressRunResult
        | CypressCommandLine.CypressFailedRunResult
) {
    if (results.status === "failed") {
        error(
            `Aborting: failed to run ${results.failures} tests:`,
            results.message
        );
        return;
    }
    if (!CONTEXT.config.xray.uploadResults) {
        log(
            "Skipping results upload: Plugin is configured to not upload test results."
        );
        return;
    }
    await CONTEXT.client.importExecutionResults(
        results as CypressCommandLine.CypressRunResult
    );
}

export async function filePreprocessorHook(
    file: Cypress.FileObject
): Promise<string> {
    if (file.filePath.endsWith(CONTEXT.config.cucumber.featureFileExtension)) {
        const relativePath = file.filePath.substring(
            file.filePath.indexOf("cypress")
        );
        try {
            // Extract tag information for later use, e.g. when uploading test
            // results to specific issues.
            const feature = parseFeatureFile(file.filePath).feature;
            CONTEXT.config.cucumber.issues = issuesByScenario(
                feature,
                CONTEXT.config.jira.projectKey
            );
            if (CONTEXT.config.cucumber.downloadFeatures) {
                // TODO: download feature file from Xray.
                throw new Error("feature not yet implemented");
            }
            if (CONTEXT.config.cucumber.uploadFeatures) {
                log(`Synchronizing upstream Cucumber tests (${relativePath})`);
                await CONTEXT.client.importCucumberTests(
                    file.filePath,
                    CONTEXT.config.jira.projectKey
                );
            }
        } catch (e: unknown) {
            error(`Feature file invalid, skipping synchronization: ${e}`);
        }
    }
    return file.filePath;
}
