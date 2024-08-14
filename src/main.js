const core = require('@actions/core');
const github = require('@actions/github');


const reportFile = core.getInput('who-to-greet'); // repo/coverage/coverageSummary.txt

// const CODE_COVERAGE_THRESHOLD = 0;


require('fs').readFile(reportFile, (err, buffer) => {
    if (err) throw new Error(err);
    let summary = parseSummary(buffer.toString());
    // if (CODE_COVERAGE_THRESHOLD > summary.Total.percent) {
    //     throw new Error(thresholdErrorMessage(summary));
    // }
    writeCoverageReport(summary);
})

// function thresholdErrorMessage() {
//     msg = `** Code level coverage is too low (${summary.Total.percent}%, minimum required ${CODE_COVERAGE_THRESHOLD} %) **`;
//     let strLen = msg.length;
//     let border = "\n" + "".padStart(strLen, "*") + "\n";
//     return border + msg + border;
// }

function parseSummary(summary) {
    let result = {};
    const pattern = /(Classes|Methods|Lines):\s*(\d{1,3}\.\d{0,2})%\s*(\(.*\))/iug;
    for (const matchLine of summary.matchAll(pattern)) {
        if (matchLine[1] === "Lines") matchLine[1] = "Total";
        result[matchLine[1]] = {title: matchLine[1], percent: parseFloat(matchLine[2]), ratio: matchLine[3]}
    }
    return result;
}

function writeCoverageReport(summary) {
    let msgToPush = {
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: ""
    };

    msgToPush.body = "### Pull request summary\n";
    msgToPush.body += "Code coverage:\n";
    msgToPush.body += `**${summary.Methods.title}**: ${summary.Methods.percent}% ${summary.Methods.ratio}\n`;
    msgToPush.body += `**${summary.Total.title}**: ${summary.Total.percent}% ${summary.Total.ratio}\n`;


    github.rest.issues.listComments({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
    }).then((response) => {
        let createNew = true;
        for (const message of response.data) {
            if (message.user.type === "Bot") {
                msgToPush.comment_id = message.id;
                createNew = false;
                break;
            }
        }
        if (createNew) {
            github.rest.issues.createComment(msgToPush);
        } else {
            github.rest.issues.updateComment(msgToPush);
        }
    }, error => {
        throw new Error(error);
    });
}