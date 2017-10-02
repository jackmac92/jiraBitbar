const bitbar = require('bitbar');
const JiraFetcher = require('cbiJira');
const CrucibleFetcher = require('crucible');
const path = require('path');
const _ = require('lodash');

const { JIRA_USERNAME, JIRA_PASSWORD, CRUCIBLE_USERNAME, CRUCIBLE_PASSWORD } = process.env;
const jiraUrl = 'https://cbinsights.atlassian.net';
const { sep: Separator } = bitbar;
const statusCategories = {};
const jiraInfo = new JiraFetcher({
  dir: path.resolve(process.env.HOME, './jiraCache'),
  username: JIRA_USERNAME,
  password: JIRA_PASSWORD,
});

const parseReviewInfo = review => ({
  href: `http://crucible.cbinsights.com/cru/${review.permaId.id}`,
  author: review.author.displayName,
  reviewName: review.name,
  description: review.description,
  dueDate: new Date(review.dueDate),
  openSince: new Date(review.createDate),
  jiraLink: review.jiraIssueKey,
});

const formatCrucible = ({ author, reviewName, description, dueDate, openSince, href, jiraLink = '' }) => ({
  text: reviewName,
  color: new Date() > dueDate ? 'red' : 'white',
  href,
  submenu: {
    text: description,
  },
});

const getColor = statusId => {
  const color = statusCategories[statusId].colorName;
  return (
    {
      'blue-gray': 'blue',
    }[color] || color
  );
};

const getJiraInfo = () =>
  jiraInfo
    .getToDos()
    .catch(err => {
      console.log('ERRROR');
      console.log(process.env.JIRA_USERNAME)
      console.log(process.env.JIRA_PASSWORD)
      console.log(err);
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
        text: 'Tickets',
        dropdown: false,
      };
      return bestFormat;
      // return bitbar([aboveTheFold, Separator, { text: 'Tickets', size: '25' }, ...bestFormat]);
    });

const getReviewInfo = async () => {
  const crucibleInfo = new CrucibleFetcher(CRUCIBLE_USERNAME, CRUCIBLE_PASSWORD);
  await crucibleInfo.setup();
  const reviews = await crucibleInfo.getReviews();
  return reviews.map(parseReviewInfo).map(r => {
    try {
      return formatCrucible(r);
    } catch (e) {
      console.error(e);
      return {};
    }
  });
};

const main = async () => {
  try {
    const [jra, cru] = await Promise.all([getJiraInfo(), getReviewInfo()]);
    return bitbar([
      {
        text: 'Tickets',
        dropdown: false,
      },
      Separator,
      { text: 'Reviews', size: '25' },
      ...cru,
      Separator,
      { text: 'Tickets', size: '25' },
      ...jra,
    ]);
  } catch (e) {
    console.error(e);
  }
};

main();
