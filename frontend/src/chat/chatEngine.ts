export interface SuggestedAction {
  label: string;
  type: 'NAVIGATE' | 'BOOK';
  payload: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  suggestedActions?: SuggestedAction[];
}

function cleanText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateChatResponse(message: string): ChatResponse {
  const clean = cleanText(message);

  // 1. Identity & Name ("whats ur name", "who r u", "who are you")
  if (
    clean.includes('whats ur name') ||
    clean.includes('what is your name') ||
    clean.includes('whats your name') ||
    clean.includes('who r u') ||
    clean.includes('who are you') ||
    clean.includes('what are you') ||
    clean.includes('tell me about yourself') ||
    clean.includes('who made you') ||
    clean.includes('who created you') ||
    clean === 'your name' ||
    clean === 'ur name'
  ) {
    return {
      reply: "Namaste! I'm VidyaBot (also known as AsanaBot), your intelligent library guide and study companion on Vidya Asana! 📚✨\n\nI can help you find quiet ergonomic desks, book study pods, manage check-in QR passes, track your Pomodoro streaks, and join seat waitlists. How can I assist your study session today?",
      suggestedActions: [
        { label: 'Discover Libraries', type: 'NAVIGATE', payload: { path: '/app/discover' } },
        { label: 'Study Timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
        { label: 'My Bookings', type: 'NAVIGATE', payload: { path: '/app/bookings' } },
      ],
    };
  }

  // 2. Streaks & Opting Out ("i dont wanna hv streaks", "what are streaks")
  if (
    clean.includes('streak') ||
    clean.includes('streaks') ||
    clean.includes('streek')
  ) {
    return {
      reply: "No worries at all! Daily streaks on Vidya Asana are 100% optional gamification features meant purely for personal motivation. 🎯\n\nThere are **zero penalties** or score drops if you skip days or don't feel like tracking streaks. You can study on your own terms and book seats whenever it suits your personal schedule.",
      suggestedActions: [
        { label: 'Study Preferences', type: 'NAVIGATE', payload: { path: '/app/preferences' } },
        { label: 'Book a Seat', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    };
  }

  // 3. Demotivation / Lack of Motivation / Laziness ("bro i domt wanna go to lib", "dont feel like studying")
  if (
    clean.includes('wanna go to lib') ||
    clean.includes('want to go to lib') ||
    clean.includes('wanna go to library') ||
    clean.includes('want to go to library') ||
    clean.includes('domt wanna go') ||
    clean.includes('dont wanna go') ||
    clean.includes('dont want to go') ||
    clean.includes('domt want to go') ||
    clean.includes('dont feel like studying') ||
    clean.includes('domt feel like studying') ||
    clean.includes('not motivated') ||
    clean.includes('cant study') ||
    clean.includes('cannot study') ||
    clean.includes('lazy') ||
    clean.includes('procrastinat') ||
    clean.includes('hate studying') ||
    clean.includes('tired of studying') ||
    ((clean.includes('dont wanna') || clean.includes('domt wanna') || clean.includes('dont want to')) &&
      (clean.includes('lib') || clean.includes('library') || clean.includes('study')))
  ) {
    return {
      reply: "We've all been there — study fatigue is completely real! ☕ It is totally okay to have off days.\n\nHere are 3 low-pressure ways to handle it:\n1. 🛋️ **Study from home**: Run a gentle 25-minute Pomodoro session with zero pressure.\n2. 🚶 **Change of scenery**: A quiet, air-conditioned study hall often naturally resets your brain without forced willpower.\n3. 🌿 **Take a real break**: Sometimes stepping away for an afternoon recharge does more good than fighting yourself.\n\nTake it at your own pace today!",
      suggestedActions: [
        { label: 'Start 25m Timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
        { label: 'Browse Quiet Spaces', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    };
  }

  // 4. Cancel Booking ("can u cancel my booking", "how to cancel booking")
  if (
    clean.includes('cancel') ||
    clean.includes('cancle') ||
    clean.includes('drop seat') ||
    clean.includes('release seat') ||
    clean.includes('refund')
  ) {
    return {
      reply: "You can easily cancel an active reservation from your student dashboard:\n\n1. Go to **My Bookings**.\n2. Locate the reservation you wish to cancel.\n3. Click **Cancel Booking** and confirm.\n\n💡 *Tip*: Cancelling at least 1 hour before slot commencement frees up the desk for students on the waitlist and keeps your attendance record pristine!",
      suggestedActions: [
        { label: 'My Bookings', type: 'NAVIGATE', payload: { path: '/app/bookings' } },
        { label: 'Discover Desks', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    };
  }

  // 5. Pomodoro Technique & Focus Timer (handles typos: "whats pomodro", "pomodoro", "pomo")
  if (
    clean.includes('pomodro') ||
    clean.includes('pomodoro') ||
    clean.includes('pomo') ||
    clean.includes('pomadoro') ||
    clean.includes('study timer') ||
    clean.includes('focus timer') ||
    clean.includes('stopwatch')
  ) {
    return {
      reply: "The **Pomodoro Technique** is a proven time-management method designed to prevent burnout:\n\n⏱️ **25 Minutes Focus**: Pick one specific topic and study with zero distractions.\n☕ **5 Minutes Break**: Stretch, grab water, or rest your eyes.\n🔁 **Repeat 4 Times**: After 4 cycles, take a well-deserved 15–30 minute long break.\n\n💡 On Vidya Asana, using our integrated **Study Room timer** automatically tracks your focus hours and builds your daily streaks!",
      suggestedActions: [
        { label: 'Open Study Timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
        { label: 'View Leaderboard', type: 'NAVIGATE', payload: { path: '/app/leaderboard' } },
      ],
    };
  }

  // 6. Best Library / Recommendations ("which is best lib", "recommend library")
  if (
    clean.includes('which is best lib') ||
    clean.includes('best lib') ||
    clean.includes('recommend lib') ||
    clean.includes('top lib') ||
    clean.includes('best library') ||
    clean.includes('recommend library') ||
    clean.includes('top library') ||
    clean.includes('good library') ||
    clean.includes('where should i study') ||
    clean.includes('best place to study')
  ) {
    return {
      reply: "Here are our top study space recommendations on Vidya Asana:\n\n⭐ **Central Study Hub** (Ashok Nagar / MG Road)\n• *Best for*: Deep exam focus, UPSC/GATE preparation, and team projects.\n• *Highlights*: Two dedicated study floors, individual silent pods, high-speed WiFi, power outlets at every desk, and discussion rooms.\n\n🌿 **Koramangala Community Library** (4th Block)\n• *Best for*: Peaceful, free neighborhood study sanctuary with natural light and reading desks.\n\n🏛️ **North Gate Reading Room** (Hebbal)\n• *Best for*: Quiet heritage ambiance and extended reading sessions.",
      suggestedActions: [
        { label: 'Explore All Libraries', type: 'NAVIGATE', payload: { path: '/app/discover' } },
        { label: 'Book Central Study Hub', type: 'NAVIGATE', payload: { path: '/app/libraries/lib-1/book' } },
      ],
    };
  }

  // 7. Leaderboards & Rankings ("whats leaderboards", "ranking", "points")
  if (
    clean.includes('leaderboard') ||
    clean.includes('leaderboards') ||
    clean.includes('ranking') ||
    clean.includes('rankings') ||
    clean.includes('scoreboard') ||
    clean.includes('points')
  ) {
    return {
      reply: "The **Vidya Asana Leaderboard** highlights the most dedicated learners on the platform! 🏆\n\n• **Focus Hours**: Every minute you spend in the Study Room with the Pomodoro or Stopwatch timer contributes to your total.\n• **Campus Ranks**: See how your daily and weekly study consistency stacks up against your peers.\n• **Achievements**: Unlock milestones for hitting 10, 50, and 100+ focused hours.",
      suggestedActions: [
        { label: 'View Leaderboard', type: 'NAVIGATE', payload: { path: '/app/leaderboard' } },
        { label: 'Start Study Timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
      ],
    };
  }

  // 8. Rules & Etiquette (food, drinks, water, noise, phone calls, smoking)
  if (
    clean.includes('rule') ||
    clean.includes('rules') ||
    clean.includes('food') ||
    clean.includes('eat') ||
    clean.includes('eating') ||
    clean.includes('snack') ||
    clean.includes('drink') ||
    clean.includes('water') ||
    clean.includes('coffee') ||
    clean.includes('smoking') ||
    clean.includes('phone') ||
    clean.includes('call') ||
    clean.includes('noise') ||
    clean.includes('silence') ||
    clean.includes('loud')
  ) {
    return {
      reply: "Here are the core **Vidya Asana Library Rules** to ensure a quiet, respectful atmosphere for everyone:\n\n🤫 **Silence Zones**: Strict silence in individual pods. Keep phones silent or on vibrate.\n🗣️ **Group Discussions**: Collaborative studying and calls are permitted only in designated Discussion Pods (Floor 2).\n☕ **Food & Drink**: Covered tumblers & water bottles are welcome at desks. Meals and snacks must be consumed in the cafeteria.\n🎫 **Check-in**: Scan your QR pass within 30 minutes of slot commencement so your seat isn't released to the waitlist.",
      suggestedActions: [
        { label: 'Filter Quiet Desks', type: 'NAVIGATE', payload: { path: '/app/discover?quietZone=true' } },
        { label: 'Browse Group Pods', type: 'NAVIGATE', payload: { path: '/app/discover?seatType=GROUP' } },
      ],
    };
  }

  // 9. QR Pass & Check-In ("qr", "check in", "scanner", "entry pass")
  if (
    clean.includes('qr') ||
    clean.includes('check in') ||
    clean.includes('checkin') ||
    clean.includes('entry pass') ||
    clean.includes('gate pass') ||
    clean.includes('scanner') ||
    clean.includes('barcode')
  ) {
    return {
      reply: "Checking in with your digital pass is seamless:\n\n1. Open **My Bookings** on your phone.\n2. Tap your upcoming reservation to reveal your **Dynamic Entry QR Pass**.\n3. Scan the QR code at the library entrance scanner or present it at the front desk.\n\n⚠️ **Important**: Please scan within **30 minutes** of your slot start time, otherwise the system automatically frees the desk for students on the waitlist.",
      suggestedActions: [
        { label: 'My Bookings', type: 'NAVIGATE', payload: { path: '/app/bookings' } },
      ],
    };
  }

  // 10. Waitlist & Sold-Out Slots ("waitlist", "queue", "full", "sold out", "no seats")
  if (
    clean.includes('waitlist') ||
    clean.includes('wait list') ||
    clean.includes('queue') ||
    clean.includes('full') ||
    clean.includes('sold out') ||
    clean.includes('no seat') ||
    clean.includes('no desks')
  ) {
    return {
      reply: "If your preferred study slot or library is completely full, you can join the **Waitlist** with one tap! 📋\n\n• When another student cancels or fails to scan their QR code within 30 minutes, the seat is immediately freed.\n• You'll receive a high-priority notification with a **10-minute priority window** to confirm and claim the reservation before it's released publicly.",
      suggestedActions: [
        { label: 'My Waitlists', type: 'NAVIGATE', payload: { path: '/app/waitlist' } },
        { label: 'Discover Other Libraries', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    };
  }

  // 11. Seat Types: Quiet / Window, Group, Computer, Accessible
  if (clean.includes('quiet') || clean.includes('silent') || clean.includes('window')) {
    return {
      reply: 'Looking for peace and natural light? Central Study Hub offers soundproof individual focus pods and desks facing natural daylight windows on Floor 1.',
      suggestedActions: [
        { label: 'Filter Quiet Desks', type: 'NAVIGATE', payload: { path: '/app/discover?quietZone=true' } },
        { label: 'View Floor 1 Silent Pods', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    };
  }

  if (clean.includes('group') || clean.includes('team') || clean.includes('meeting') || clean.includes('collaborat')) {
    return {
      reply: 'Central Study Hub has discussion pods on Floor 2 equipped with whiteboards and collaborative tables for team study.',
      suggestedActions: [
        { label: 'Browse Group Pods', type: 'NAVIGATE', payload: { path: '/app/discover?seatType=GROUP' } },
      ],
    };
  }

  if (clean.includes('computer') || clean.includes('pc') || clean.includes('terminal') || clean.includes('desktop')) {
    return {
      reply: 'Computer workstations with high-speed wired Ethernet, external monitors, and power surge protection are available on Floor 1.',
      suggestedActions: [
        { label: 'View Computer Workstations', type: 'NAVIGATE', payload: { path: '/app/discover?seatType=COMPUTER' } },
      ],
    };
  }

  if (clean.includes('wheelchair') || clean.includes('accessib')) {
    return {
      reply: 'Accessible study desks with extra clearance and step-free ground floor access are available at Central Study Hub.',
      suggestedActions: [
        { label: 'View Accessible Desks', type: 'NAVIGATE', payload: { path: '/app/discover?seatType=ACCESSIBLE' } },
      ],
    };
  }

  // 12. Pricing & Free Libraries ("is it free", "cost", "pricing", "fees")
  if (
    clean.includes('price') ||
    clean.includes('pricing') ||
    clean.includes('cost') ||
    clean.includes('how much') ||
    clean.includes('fees') ||
    clean.includes('fee') ||
    clean.includes('free') ||
    clean.includes('charges') ||
    clean.includes('payment') ||
    clean.includes('pay')
  ) {
    return {
      reply: "Vidya Asana offers study spaces for every budget:\n\n• **100% Free Libraries**: Community libraries like Koramangala Community Library are public and completely free to use.\n• **Premium Partner Hubs**: Spaces like Central Study Hub charge modest maintenance fees (approx. ₹50–₹60 per half-day slot) covering high-speed fiber internet, continuous air conditioning, and power backup.",
      suggestedActions: [
        { label: 'Filter Free Libraries', type: 'NAVIGATE', payload: { path: '/app/discover?isFree=true' } },
        { label: 'Explore All Libraries', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    };
  }

  // 13. Amenities (WiFi, AC, Lockers, Charging, Sockets)
  if (
    clean.includes('wifi') ||
    clean.includes('internet') ||
    clean.includes('ac') ||
    clean.includes('air condition') ||
    clean.includes('air conditioning') ||
    clean.includes('locker') ||
    clean.includes('lockers') ||
    clean.includes('charging') ||
    clean.includes('socket') ||
    clean.includes('power outlet') ||
    clean.includes('plug') ||
    clean.includes('washroom')
  ) {
    return {
      reply: "Our partner libraries come fully equipped for serious study sessions:\n\n⚡ **Power Outlets**: Dedicated universal sockets at every desk for laptops and phones.\n📶 **High-Speed WiFi**: 100+ Mbps dual-band fiber internet.\n❄️ **Climate Control**: Centralized air conditioning throughout study halls.\n🔒 **Secure Lockers**: RFID and key storage for backpacks and personal items.\n🛡️ **CCTV**: 24/7 security monitoring for your peace of mind.",
      suggestedActions: [
        { label: 'Discover Amenities', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    };
  }

  // 14. Target Exams & Preferences (UPSC, GATE, CAT, JEE, NEET)
  if (
    clean.includes('upsc') ||
    clean.includes('gate') ||
    clean.includes('cat') ||
    clean.includes('jee') ||
    clean.includes('neet') ||
    clean.includes('preference') ||
    clean.includes('study mode')
  ) {
    return {
      reply: "Under **Preferences**, you can configure your target examination (e.g. UPSC, GATE, CAT, JEE, Medical) and seating habits (window-facing, silent zone, morning vs evening slots).\n\nVidya Asana uses these settings to calculate personalized match scores and recommend the best desks for your prep!",
      suggestedActions: [
        { label: 'Edit Preferences', type: 'NAVIGATE', payload: { path: '/app/preferences' } },
      ],
    };
  }

  // 15. Greetings & Casual Inquiries ("how r u", "wassup", "yo", "hi", "hey", "namaste")
  if (
    clean.includes('how r u') ||
    clean.includes('how are you') ||
    clean.includes('hows it going') ||
    clean.includes('how do you do') ||
    clean.includes('wassup') ||
    clean.includes('watsup') ||
    clean.includes('whatsup') ||
    clean.includes('whats up') ||
    clean === 'sup' ||
    clean === 'yo' ||
    clean.startsWith('yo ') ||
    clean === 'hey' ||
    clean.startsWith('hey ') ||
    clean === 'hello' ||
    clean.startsWith('hello ') ||
    clean === 'hi' ||
    clean.startsWith('hi ') ||
    clean === 'namaste' ||
    clean.includes('good morning') ||
    clean.includes('good evening') ||
    clean.includes('good afternoon')
  ) {
    return {
      reply: "Hey! Great to see you! 👋 I'm doing great and ready to help you have an awesome, focused study session today.\n\nWhether you need to find a quiet desk with power outlets, start a 25-minute Pomodoro sprint, or check your upcoming reservation passes, just let me know what you need!",
      suggestedActions: [
        { label: 'Discover Libraries', type: 'NAVIGATE', payload: { path: '/app/discover' } },
        { label: 'Study Timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
        { label: 'My Bookings', type: 'NAVIGATE', payload: { path: '/app/bookings' } },
      ],
    };
  }

  // 16. Jokes & Humor ("joke", "tell me a joke", "funny")
  if (clean.includes('joke') || clean.includes('make me laugh') || clean.includes('funny')) {
    return {
      reply: "Why did the textbook sit on the chair? 📚\nBecause it wanted to get a higher education!\n\n😄 Now that your spirits are up, ready to dive into some focused study time?",
      suggestedActions: [
        { label: 'Start 25m Timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
        { label: 'Find a Quiet Desk', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    };
  }

  // 17. Gratitude & Goodbye ("thanks", "thank you", "bye", "good night")
  if (
    clean.includes('thank') ||
    clean.includes('thx') ||
    clean.includes('ty') ||
    clean.includes('appreciate') ||
    clean.includes('bye') ||
    clean.includes('goodbye') ||
    clean.includes('see you') ||
    clean.includes('good night')
  ) {
    return {
      reply: "You're very welcome! 😊 Wishing you a productive and smooth study session today. Stay hydrated, take regular stretch breaks, and feel free to ask anytime you need a hand!",
      suggestedActions: [
        { label: 'Launch Study Timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
      ],
    };
  }

  // 18. Help & Overview of Features ("help", "what can you do", "menu")
  if (
    clean.includes('help') ||
    clean.includes('what can you do') ||
    clean.includes('menu') ||
    clean.includes('options') ||
    clean.includes('features')
  ) {
    return {
      reply: "Here's what I can do for you as your Vidya Asana assistant:\n\n1. 🪑 **Find Desks**: Recommend silent pods, group tables, or computer workstations.\n2. 📅 **Manage Bookings**: Guide you on reservations, cancellations, and digital QR passes.\n3. ⏱️ **Focus & Study**: Explain Pomodoro cycles, track study time, and view leaderboards.\n4. 📜 **Library Rules**: Answer questions about noise levels, food/drink, and timings.\n5. 📋 **Waitlists**: Help you queue for fully booked slots with automatic notifications.",
      suggestedActions: [
        { label: 'Discover Libraries', type: 'NAVIGATE', payload: { path: '/app/discover' } },
        { label: 'My Bookings', type: 'NAVIGATE', payload: { path: '/app/bookings' } },
        { label: 'Study Room', type: 'NAVIGATE', payload: { path: '/app/study' } },
      ],
    };
  }

  // 19. Intelligent Fallback for all other queries
  return {
    reply: "I'm here as your Vidya Asana AI study companion! 📚\n\nI want to make sure you get exactly what you need. How can I assist you right now?\n• **Find a Desk**: Discover quiet spaces with WiFi and power outlets\n• **Study Room**: Launch an integrated Pomodoro timer to earn leaderboard points\n• **Bookings & QR**: View upcoming reservations or get check-in instructions\n• **Library Rules**: Learn about silence zones, snacks, and entry timings",
    suggestedActions: [
      { label: 'Discover Libraries', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      { label: 'My Bookings', type: 'NAVIGATE', payload: { path: '/app/bookings' } },
      { label: 'Study Timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
    ],
  };
}
