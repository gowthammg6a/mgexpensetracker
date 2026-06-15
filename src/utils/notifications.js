export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendNotification(title, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/vite.svg', // Assuming standard Vite icon or use emoji
      ...options
    });
  }
}

export function checkBudgetNotification(totalSpent, newExpenseAmount, budget) {
  const previousTotal = totalSpent - newExpenseAmount;
  
  // Crossed 100%
  if (previousTotal <= budget && totalSpent > budget) {
    sendNotification('Budget Exceeded! ⚠️', {
      body: `You've crossed your monthly limit of ₹${budget}. Total spent: ₹${totalSpent}.`,
    });
    return;
  }
  
  // Crossed 80%
  const eightyPercent = budget * 0.8;
  if (previousTotal <= eightyPercent && totalSpent > eightyPercent && totalSpent <= budget) {
    sendNotification('Budget Alert 📊', {
      body: `You've used 80% of your monthly budget. Only ₹${budget - totalSpent} remaining.`,
    });
  }
}

export function checkSubscriptionNotifications(subscriptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  subscriptions.forEach(sub => {
    const nextDate = new Date(sub.nextDate);
    nextDate.setHours(0, 0, 0, 0);
    
    if (nextDate.getTime() === today.getTime()) {
      sendNotification(`${sub.emoji} Subscription Due Today!`, {
        body: `Your ${sub.name} bill for ₹${sub.amount} is due today.`,
      });
    } else if (nextDate.getTime() === tomorrow.getTime()) {
      sendNotification(`${sub.emoji} Upcoming Subscription`, {
        body: `Your ${sub.name} bill for ₹${sub.amount} is due tomorrow.`,
      });
    }
  });
}
