import { IPreprocessorConfiguration } from "@badeball/cypress-cucumber-preprocessor";
import { IJiraClient } from "../client/jira/jiraClient";
import { IXrayClient } from "../client/xray/xrayClient";
import { IJiraRepository } from "../repository/jira/jiraRepository";
import { IIssueTypeDetails } from "./jira/responses/issueTypeDetails";

export interface Options {
    jira: JiraOptions;
    plugin?: PluginOptions;
    xray?: XrayOptions;
    cucumber?: CucumberOptions;
    openSSL?: OpenSSLOptions;
}

export type JiraFieldIds = {
    /**
     * The Jira issue description field ID.
     */
    description?: string;
    /**
     * The Jira issue labels field ID.
     */
    labels?: string;
    /**
     * The Jira issue summary field ID (i.e. the title of the issues).
     */
    summary?: string;
    /**
     * The Xray test environments field ID (i.e. the test environments associated with test
     * execution issues).
     *
     * *Note: This option is required for server instances only. Xray cloud provides ways to
     * retrieve test environment field information independently of Jira.*
     */
    testEnvironments?: string;
    /**
     * The test plan field ID of Xray test (execution) issues.
     *
     * *Note: This option is required for server instances only. Xray cloud provides ways to
     * retrieve test plan field information independently of Jira.*
     */
    testPlan?: string;
    /**
     * The test type field ID of Xray test issues.
     *
     * *Note: This option is required for server instances only. Xray cloud provides ways to
     * retrieve test type field information independently of Jira.*
     */
    testType?: string;
};

export interface JiraOptions {
    /**
     * The Jira project key.
     *
     * @example "CYP"
     */
    projectKey: string;
    /**
     * Whether any videos Cypress captured during test execution should be attached to the test
     * execution issue on results upload.
     */
    attachVideos?: boolean;
    /**
     * Jira Field IDs to make all fields required during the upload process uniquely identifiable.
     *
     * By default, the plugin accesses field information using the fields' names (`Summary`,
     * `Description`, ...) just fine. Still, providing the fields' IDs here might become necessary
     * in the following scenarios:
     * - Your Jira language setting is a language other than English. For example, when the plugin
     * tries to access the `Summary` field and the Jira language is set to French, access will fail
     * because Jira only provides access to a field called `Résumé` instead.
     * - Your Jira project contains several fields with identical names.
     *
     * *Note: In case you don't know these properties or if you are unsure whether they are really
     * needed, the plugin will try to provide lists of field candidates in case any errors occur.
     * You can then extract all required information from these candidates.*
     *
     * *Please consult the official documentation for more information about field IDs: https://confluence.atlassian.com/jirakb/how-to-find-id-for-custom-field-s-744522503.html*
     *
     * @example
     * ```ts
     *   fields: {
     *     description: "description",
     *     testPlan: "customfield_12643"
     *   }
     * ```
     */
    fields?: JiraFieldIds;
    /**
     * The description of the test execution issue, which will be used both for new test execution
     * issues as well as for updating existing issues (if provided through
     * {@link JiraOptions.testExecutionIssueKey}).
     *
     * If omitted, test execution issues will have the following description:
     * ```ts
     * `Cypress version: ${cypressVersion} Browser: ${browserName} (${browserVersion})`
     * ```
     */
    testExecutionIssueDescription?: string;
    /**
     * An execution issue key to attach run results to. If omitted, Jira will always create a new
     * test execution issue with each upload.
     *
     * *Note: it must be prefixed with the project key.*
     *
     * @example "CYP-123"
     */
    testExecutionIssueKey?: string;
    /**
     * The summary of the test execution issue, which will be used both for new test execution
     * issues as well as for updating existing issues (if provided through
     * {@link JiraOptions.testExecutionIssueKey}).
     *
     * If omitted, test execution issues will be named as follows:
     * ```ts
     * `Execution Results [${t}]`,
     * ```
     * where `t` is the timestamp when Cypress started testing.
     */
    testExecutionIssueSummary?: string;
    /**
     * The issue type name of test executions. By default, Xray calls them `Test Execution`, but
     * it's possible that they have been renamed or translated in your Jira instance.
     */
    testExecutionIssueType?: string;
    /**
     * A test plan issue key to attach the execution to.
     *
     * *Note: it must be prefixed with the project key.*
     *
     * @example "CYP-567"
     */
    testPlanIssueKey?: string;
    /**
     * The issue type name of test plans. By default, Xray calls them `Test Plan`, but it's possible
     * that they have been renamed or translated in your Jira instance.
     */
    testPlanIssueType?: string;
    /**
     * Use this parameter to specify the base URL of your Jira instance.
     *
     * @example "https://example.org/development/jira" // Jira server
     * @example "https://your-domain.atlassian.net" // Jira cloud
     */
    url: string;
}

/**
 * A more specific Jira options type with optional properties converted to required ones if
 * default/fallback values are used by the plugin.
 */
export type InternalJiraOptions = JiraOptions &
    Required<
        Pick<
            JiraOptions,
            | "attachVideos"
            | "fields"
            | "projectKey"
            | "testExecutionIssueType"
            | "testPlanIssueType"
            | "url"
        >
    > & {
        /**
         * The details of the test execution issue type.
         */
        testExecutionIssueDetails: IIssueTypeDetails;
    };

export interface XrayOptions {
    /**
     * A mapping of Cypress statuses to corresponding Xray statuses.
     */
    status?: {
        /**
         * The Xray status name of a test marked as failed by Cypress. Should be used when custom
         * status names have been setup in Xray.
         *
         * @example "FEHLGESCHLAGEN" // german
         */
        failed?: string;
        /**
         * The Xray status name of a test marked as passed by Cypress. Should be used when custom
         * status names have been setup in Xray.
         *
         * @example "BESTANDEN" // german
         */
        passed?: string;
        /**
         * The Xray status name of a test marked as pending by Cypress. Should be used when custom
         * status names have been setup in Xray.
         *
         * @example "EN_ATTENTE" // french
         */
        pending?: string;
        /**
         * The Xray status name of a test marked as skipped by Cypress. Should be used when custom
         * status names have been setup in Xray.
         *
         * @example "OMIT" // french
         */
        skipped?: string;
    };
    /**
     * The test environments for test execution issues. These will be used as follows:
     * - if the plugin creates new test execution issues, they will be associated with the issue
     * - if the plugin reuses existing test execution issues, they will:
     *   - replace existing test environments
     *   - be added if the issue does not yet have any test environments associated
     *
     * *Note: Xray's API only allows _replacing_ test environments in the plugin's scope. It is not
     * possible to completely _remove_ all existing test environments during result upload.
     * Completely removing all existing environments needs to be done manually.*
     *
     * @see {@link https://docs.getxray.app/display/XRAY/Working+with+Test+Environments | Xray server documentation}
     * @see {@link https://docs.getxray.app/display/XRAYCLOUD/Working+with+Test+Environments | Xray cloud documentation}
     */
    testEnvironments?: [string, ...string[]];
    /**
     * Turns execution results upload on or off. Useful when switching upload on or off from the
     * command line (via environment variables).
     */
    uploadResults?: boolean;
    /**
     * Turns on or off the upload of screenshots Cypress takes during test execution.
     */
    uploadScreenshots?: boolean;
}

/**
 * A more specific Xray options type with optional properties converted to required ones if
 * default/fallback values are used by the plugin.
 */
export type InternalXrayOptions = XrayOptions &
    Required<Pick<XrayOptions, "status" | "uploadResults" | "uploadScreenshots">>;

export interface CucumberOptions {
    /**
     * The file extension of feature files you want to run in Cypress. The plugin will use this to
     * parse all matching files with to extract any tags contained within them. Such tags are
     * needed to identify to which test issue a feature file belongs.
     *
     * @example ".cy.feature"
     */
    featureFileExtension: string;
    /**
     * Set it to true to automatically download feature files from Xray for Cypress to execute.
     *
     * *Note: Enable this option if the source of truth for test cases are step definitions in Xray
     * and Cypress is only used for running tests.*
     */
    downloadFeatures?: boolean;
    /**
     * Set it to true to automatically create or update existing Xray issues (summary, steps),
     * based on the feature file executed by Cypress.
     *
     * *Note: Enable this option if the source of truth for test cases are local feature files in
     * Cypress and Xray is only used for tracking execution status/history.*
     */
    uploadFeatures?: boolean;
}

/**
 * A more specific Cucumber options type with optional properties converted to required ones if
 * default/fallback values are used by the plugin.
 */
export type InternalCucumberOptions = CucumberOptions &
    Required<
        Pick<CucumberOptions, "featureFileExtension" | "downloadFeatures" | "uploadFeatures">
    > & {
        /**
         * The Cucumber preprocessor configuration.
         */
        preprocessor?: IPreprocessorConfiguration;
    };

export interface PluginOptions {
    /**
     * Enables or disables the entire plugin. Setting this option to `false` disables all plugin
     * functions, including authentication checks, uploads or feature file synchronization.
     */
    enabled?: boolean;
    /**
     * Turns on or off extensive debugging output.
     */
    debug?: boolean;
    /**
     * The directory which all error and debug log files will be written to.
     */
    logDirectory?: string;
    /**
     * Some Xray setups might struggle with uploaded evidence if the filenames contain non-ASCII
     * characters. With this option enabled, the plugin only allows characters `a-zA-Z0-9.` in
     * screenshot names and replaces all other sequences with `_`.
     */
    normalizeScreenshotNames?: boolean;
}

/**
 * A more specific Cucumber options type with optional properties converted to required ones if
 * default/fallback values are used by the plugin.
 */
export type InternalPluginOptions = PluginOptions &
    Required<
        Pick<PluginOptions, "debug" | "enabled" | "logDirectory" | "normalizeScreenshotNames">
    >;

export interface OpenSSLOptions {
    /**
     * Specify the path to a root CA in .pem format. This will then be used to authenticate against
     * the Xray instance.
     */
    rootCAPath?: string;
    /**
     * A {@link https://nodejs.org/api/crypto.html#crypto-constants | crypto constant} that will be
     * used to configure the `securityOptions` of the
     * {@link https://nodejs.org/api/https.html#class-httpsagent | https.Agent} used for sending
     * requests to your Xray instance.
     *
     * *Note: Compute their bitwise OR if you need to set more than one option.*
     *
     * @example
     * ```ts
     * import { constants } from "crypto";
     * // ...
     *   openSSL: {
     *     secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT |
     *                    constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION
     *   }
     * // ...
     * ```
     */
    secureOptions?: number;
}

/**
 * A more specific OpenSSL options type with optional properties converted to required ones if
 * default/fallback values are used by the plugin.
 */
export type InternalOpenSSLOptions = OpenSSLOptions;

/**
 * Options only intended for internal plugin use.
 */
export interface InternalOptions {
    jira: InternalJiraOptions;
    plugin: InternalPluginOptions;
    xray: InternalXrayOptions;
    cucumber?: InternalCucumberOptions;
    openSSL: InternalOpenSSLOptions;
}

/**
 * Type describing the possible client combinations.
 */
export interface ClientCombination {
    kind: "server" | "cloud";
    jiraClient: IJiraClient;
    xrayClient: IXrayClient;
    jiraRepository: IJiraRepository;
}

export interface PluginContext {
    cypress: Cypress.PluginConfigOptions;
    internal: InternalOptions;
    clients: ClientCombination;
}
