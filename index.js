const bitbar = require('bitbar');
const JiraFetcher = require('cbiJira');
const path = require('path');
const _ = require('lodash');

const { sep: Separator } = bitbar;
const statusCategories = {};
const jiraInfo = new JiraFetcher({
  dir: path.resolve(process.env.HOME, './jiraCache'),
  username: process.env.JIRA_USERNAME,
  password: process.env.JIRA_PASSWORD
});
jiraInfo
  .getToDos()
  .then((tickets = []) => {
    const formattedTickets = tickets.map((ticket = {}) => {
      const { key, summary, status = {} } = ticket;
      const { self: url, name: statusName, statusCategory = {} } = status;
      statusCategories[statusCategory.id] =
        statusCategories[statusCategory.id] || statusCategory;
      return {
        text: `${key}: ${summary}`,
        url,
        statusId: statusCategory.id
      };
    });
    const newFormatted = _.groupBy(formattedTickets, 'statusId');
    const bestFormat = Object.keys(newFormatted).reduce(
      (accum, statusId) => [
        ...accum,
        {
          text: statusCategories[statusId].name,
          color: statusCategories[statusId].colorName
        },
        ...newFormatted[statusId].map(({ text, url, statusId }) => ({
          text,
          url,
          color: statusCategories[statusId].colorName
        }))
      ],
      []
    );
    const aboveTheFold = {
      text: 'Jira',
      dropdown: false
    };
    return bitbar([
      aboveTheFold,
      Separator,
      { text: 'Tickets', size: '25' },
      ...bestFormat
    ]);
  })
  .catch(console.log);
