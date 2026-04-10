import cronParser from 'cron-parser';

export function getNextRun(cronExpression) {
  try {
    const interval = cronParser.parseExpression(cronExpression);
    return interval.next().toISOString();
  } catch {
    return null;
  }
}

export function isValidCron(expression) {
  try {
    cronParser.parseExpression(expression);
    return true;
  } catch {
    return false;
  }
}

export function isDue(cronExpression, lastRunAt) {
  try {
    const interval = cronParser.parseExpression(cronExpression, {
      currentDate: lastRunAt ? new Date(lastRunAt) : new Date(0),
    });
    const nextRun = interval.next().toDate();
    return nextRun <= new Date();
  } catch {
    return false;
  }
}

export function describeCron(expression) {
  const parts = expression.split(' ');
  if (parts.length !== 5) return expression;

  const [min, hour, dom, month, dow] = parts;

  if (min === '0' && hour === '0' && dom === '*' && month === '*' && dow === '*') {
    return 'Daily at midnight';
  }
  if (dom === '*' && month === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (dom === '*' && month === '*' && dow === '1-5') {
    return `Weekdays at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  return expression;
}
