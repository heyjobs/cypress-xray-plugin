import { CypressRunResult as CypressRunResult_V_12 } from "../../types/cypress/12.0.0/api";
import { CypressRunResult as CypressRunResult_V_13 } from "../../types/cypress/13.0.0/api";
import { InternalOptions } from "../../types/plugin";
import { IXrayTestExecutionResults } from "../../types/xray/importTestExecutionResults";
import { dedent } from "../../util/dedent";
import { truncateISOTime } from "../../util/time";
import { TestConverter } from "./testConverter";

type CypressRunResultType = CypressRunResult_V_12 | CypressRunResult_V_13;

/**
 * A class for converting Cypress run results into Xray JSON. Both Xray server JSON and Xray cloud
 * JSON are supported.
 */
export class ImportExecutionConverter {
    /**
     * The configured plugin options.
     */
    protected readonly options: InternalOptions;

    /**
     * Construct a new converter with access to the provided options. The cloud converter flag is
     * used to deduce which sub-converters to create, if necessary (for example for converting test
     * results). When set to `true`, Xray cloud JSONs will be created, if set to `false`, the format
     * will be Xray server JSON.
     *
     * @param options - the options
     * @param isCloudConverter - whether Xray cloud JSONs should be created
     */
    constructor(options: InternalOptions, private readonly isCloudConverter: boolean) {
        this.options = options;
    }

    public async toXrayJson(results: CypressRunResultType): Promise<IXrayTestExecutionResults> {
        const testConverter: TestConverter = new TestConverter(this.options, this.isCloudConverter);
        return {
            testExecutionKey: this.options.jira.testExecutionIssueKey,
            info: {
                project: this.options.jira.projectKey,
                startDate: truncateISOTime(results.startedTestsAt),
                finishDate: truncateISOTime(results.endedTestsAt),
                description: this.getDescription(results),
                summary: this.getTextExecutionResultSummary(results),
                testPlanKey: this.options.jira.testPlanIssueKey,
                testEnvironments: this.options.xray.testEnvironments,
            },
            tests: await testConverter.toXrayTests(results),
        };
    }

    private getTextExecutionResultSummary(results: CypressRunResultType): string | undefined {
        // Don't replace existing execution summaries with the default one.
        if (
            this.options.jira.testExecutionIssueKey &&
            !this.options.jira.testExecutionIssueSummary
        ) {
            return undefined;
        }
        return (
            this.options.jira.testExecutionIssueSummary ??
            `Execution Results [${new Date(results.startedTestsAt).getTime()}]`
        );
    }

    private getDescription(results: CypressRunResultType): string | undefined {
        // Don't replace existing execution descriptions with the default one.
        if (
            this.options.jira.testExecutionIssueKey &&
            !this.options.jira.testExecutionIssueDescription
        ) {
            return undefined;
        }
        return (
            this.options.jira.testExecutionIssueDescription ??
            dedent(`
                Cypress version: ${results.cypressVersion}
                Browser: ${results.browserName} (${results.browserVersion})
            `)
        );
    }
}
