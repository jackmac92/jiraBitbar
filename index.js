const bitbar = require('bitbar');
const JiraFetcher = require('cbiJira');
const path = require('path');
const _ = require('lodash');

// const envVars = fs.readFileSync(path.join(__dirname, 'env.txt'), 'utf-8');
// const [buildUsername, buildPassword] = envVars.split('\n');

const username = process.env.JIRA_USERNAME;
const password = process.env.JIRA_PASSWORD;
const { sep: Separator } = bitbar;
const statusCategories = {};
const jiraInfo = new JiraFetcher({
  dir: path.resolve(process.env.HOME, './jiraCache'),
  username,
  password,
});

const jiraUrl = 'https://cbinsights.atlassian.net';

const getColor = statusId => {
  const color = statusCategories[statusId].colorName;
  return (
    {
      'blue-gray': 'blue',
    }[color] || color
  );
};

jiraInfo
  .getToDos()
  .catch(err => {
    console.log('ERRROR');
    console.log(username);
    process.exit(1);
  })
  .then((tickets = []) => {
    const formattedTickets = tickets.map((ticket = {}) => {
      const { key, summary, status = {} } = ticket;
      const { name: statusName, statusCategory = {} } = status;
      statusCategories[statusCategory.id] = statusCategories[statusCategory.id] || statusCategory;
      return {
        text: `${key}: ${summary}`,
        href: `${jiraUrl}/browse/${key}`,
        statusId: statusCategory.id,
      };
    });
    const newFormatted = _.groupBy(formattedTickets, 'statusId');
    const bestFormat = Object.keys(newFormatted).reduce(
      (accum, statusId) => [
        ...accum,
        {
          text: statusCategories[statusId].name,
          color: getColor(statusId),
        },
        ...newFormatted[statusId].map(({ text, href, statusId }) => ({
          text,
          href,
          color: getColor(statusId),
        })),
      ],
      []
    );
    const aboveTheFold = {
      text: 'Jira',
      dropdown: false,
    };
    return bitbar([aboveTheFold, Separator, { text: 'Tickets', size: '25' }, ...bestFormat]);
  })
  .catch(console.log);
