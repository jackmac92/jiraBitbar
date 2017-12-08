const bitbar = require('bitbar');
const JiraFetcher = require('cbiJira');
const CrucibleFetcher = require('crucible');
const path = require('path');
const _ = require('lodash');

const jiraUrl = 'https://cbinsights.atlassian.net';
const { sep: Separator } = bitbar;
const statusCategories = {};

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

const getJiraClient = () => new JiraFetcher({
  dir: path.resolve(process.env.HOME, '$HOME/.cbiCache/jiraCache'),
  username: process.env.JIRA_USERNAME,
  password: process.env.JIRA_PASSWORD,
});


const getJiraInfo = () =>
  getJiraClient()
    .getToDos()
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
      return Object.keys(newFormatted).reduce(
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
    }, err => [{ text: 'Failed to load Jira info', submenu: { text: `${err}` } }]);

const getReviewInfo = async () => {
  const crucibleInfo = new CrucibleFetcher(process.env.CRUCIBLE_USERNAME, process.env.CRUCIBLE_PASSWORD);
  await crucibleInfo.setup();
  const reviews = await crucibleInfo.getReviews();
  return reviews.map(parseReviewInfo).map(r => {
    try {
      return formatCrucible(r);
    } catch (e) {
      return [{ text: 'Failed to load Crucible info', submenu: { text: `${e}` } }];
    }
  });
};

const main = async () => {
  try {
    const [jra = [], cru = []] = await Promise.all([getJiraInfo(), getReviewInfo()]);
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
