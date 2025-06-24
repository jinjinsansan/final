// デバイス認証システム
// デバイス固有キー + パスワード + 秘密の質問による3段階認証

export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  screen: string;
  language: string;
  timezone: string;
  hardware: string;
  memory: string;
  timestamp: string;
}

export interface UserCredentials {
  lineUsername: string;
  pinCode: string;
  deviceId: string;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface AuthSession {
  userId: string;
  deviceId: string;
  lineUsername: string;
  isVerified: boolean;
  createdAt: string;
  lastActivity: string;
}

// デバイスフィンガープリント生成
export const generateDeviceFingerprint = (): DeviceFingerprint => {
  const deviceInfo = [
    navigator.userAgent || 'unknown',
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    navigator.language || 'unknown',
    new Date().getTimezoneOffset().toString(),
    (navigator as any).hardwareConcurrency?.toString() || 'unknown',
    (navigator as any).deviceMemory?.toString() || 'unknown'
  ];

  // デバイス固有IDを生成（ハッシュ化）
  const deviceString = deviceInfo.join('|');
  const deviceId = btoa(deviceString).substring(0, 32);

  return {
    id: deviceId,
    userAgent: navigator.userAgent || 'unknown',
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language || 'unknown',
    timezone: new Date().getTimezoneOffset().toString(),
    hardware: (navigator as any).hardwareConcurrency?.toString() || 'unknown',
    memory: (navigator as any).deviceMemory?.toString() || 'unknown',
    timestamp: new Date().toISOString()
  };
};

// デバイス情報の比較
export const compareDeviceFingerprints = (fp1: DeviceFingerprint, fp2: DeviceFingerprint): boolean => {
  return fp1.id === fp2.id;
};

// PIN番号のハッシュ化
export const hashPinCode = async (pinCode: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pinCode + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ソルト生成
export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// 秘密の質問リスト
export const SECURITY_QUESTIONS = [
  {
    id: 'birthplace_postal',
    question: 'あなたの出身地の郵便番号の下4桁は？',
    placeholder: '例: 1234'
  },
  {
    id: 'first_pet',
    question: '初めて飼ったペットの名前は？',
    placeholder: '例: ポチ'
  },
  {
    id: 'elementary_teacher',
    question: '小学校の時の担任の先生の苗字は？',
    placeholder: '例: 田中'
  },
  {
    id: 'favorite_combination',
    question: '好きな色と好きな数字を組み合わせると？',
    placeholder: '例: 青7'
  },
  {
    id: 'mother_maiden_name',
    question: '母親の旧姓は？',
    placeholder: '例: 佐藤'
  },
  {
    id: 'first_school',
    question: '通っていた幼稚園・保育園の名前は？',
    placeholder: '例: さくら幼稚園'
  },
  {
    id: 'childhood_nickname',
    question: '子供の頃のニックネームは？',
    placeholder: '例: みーちゃん'
  },
  {
    id: 'first_address',
    question: '初めて住んだ家の番地は？',
    placeholder: '例: 123'
  }
];

// ローカルストレージキー
export const STORAGE_KEYS = {
  DEVICE_FINGERPRINT: 'device_fingerprint',
  USER_CREDENTIALS: 'user_credentials',
  SECURITY_QUESTIONS: 'security_questions',
  AUTH_SESSION: 'auth_session',
  LOGIN_ATTEMPTS: 'login_attempts',
  ACCOUNT_LOCKED: 'account_locked'
} as const;

// 認証エラータイプ
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  DEVICE_NOT_RECOGNIZED = 'device_not_recognized',
  ACCOUNT_LOCKED = 'account_locked',
  SECURITY_QUESTION_FAILED = 'security_question_failed',
  PIN_ATTEMPTS_EXCEEDED = 'pin_attempts_exceeded',
  UNKNOWN_ERROR = 'unknown_error'
}

export class AuthError extends Error {
  constructor(public type: AuthErrorType, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// ログイン試行回数管理
export const getLoginAttempts = (username: string): number => {
  const attempts = localStorage.getItem(`${STORAGE_KEYS.LOGIN_ATTEMPTS}_${username}`);
  return attempts ? parseInt(attempts, 10) : 0;
};

export const incrementLoginAttempts = (username: string): number => {
  const attempts = getLoginAttempts(username) + 1;
  localStorage.setItem(`${STORAGE_KEYS.LOGIN_ATTEMPTS}_${username}`, attempts.toString());
  return attempts;
};

export const resetLoginAttempts = (username: string): void => {
  localStorage.removeItem(`${STORAGE_KEYS.LOGIN_ATTEMPTS}_${username}`);
};

// アカウントロック管理
export const isAccountLocked = (username: string): boolean => {
  const locked = localStorage.getItem(`${STORAGE_KEYS.ACCOUNT_LOCKED}_${username}`);
  if (!locked) return false;
  
  const lockTime = parseInt(locked, 10);
  const now = Date.now();
  const lockDuration = 24 * 60 * 60 * 1000; // 24時間
  
  if (now - lockTime > lockDuration) {
    // ロック期間が過ぎた場合は解除
    localStorage.removeItem(`${STORAGE_KEYS.ACCOUNT_LOCKED}_${username}`);
    resetLoginAttempts(username);
    return false;
  }
  
  return true;
};

export const lockAccount = (username: string): void => {
  localStorage.setItem(`${STORAGE_KEYS.ACCOUNT_LOCKED}_${username}`, Date.now().toString());
};

// セッション管理
export const createAuthSession = (credentials: UserCredentials): AuthSession => {
  const session: AuthSession = {
    userId: `${credentials.lineUsername}_${credentials.deviceId}`,
    deviceId: credentials.deviceId,
    lineUsername: credentials.lineUsername,
    isVerified: true,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
  
  localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
  return session;
};

export const getAuthSession = (): AuthSession | null => {
  const session = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
  if (!session) return null;
  
  try {
    const parsed = JSON.parse(session);
    // セッションの有効期限チェック（7日間）
    const sessionAge = Date.now() - new Date(parsed.createdAt).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7日間
    
    if (sessionAge > maxAge) {
      clearAuthSession();
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
};

export const updateSessionActivity = (): void => {
  const session = getAuthSession();
  if (session) {
    session.lastActivity = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
  }
};

export const clearAuthSession = (): void => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  logSecurityEvent('logout', getCurrentUser()?.lineUsername || 'unknown', 'ユーザーがログアウトしました');
};

// セキュリティイベントログ
export const logSecurityEvent = (type: string, username: string, details: string): void => {
  const events = getSecurityEvents();
  const newEvent = {
    id: Date.now().toString(),
    type,
    username,
    timestamp: new Date().toISOString(),
    details
  };
  
  events.push(newEvent);
  
  // 最新100件のみ保持
  const recentEvents = events.slice(-100);
  localStorage.setItem('security_events', JSON.stringify(recentEvents));
};

export const getSecurityEvents = (): any[] => {
  const events = localStorage.getItem('security_events');
  return events ? JSON.parse(events) : [];
};

// セキュリティ統計
export const getSecurityStats = () => {
  const credentials = getUserCredentials();
  const session = getAuthSession();
  const events = getSecurityEvents();
  const today = new Date().toISOString().split('T')[0];
  
  return {
    totalUsers: credentials ? 1 : 0,
    activeUsers: session ? 1 : 0,
    lockedUsers: credentials && isAccountLocked(credentials.lineUsername) ? 1 : 0,
    todayLogins: events.filter(e => e.type === 'login_success' && e.timestamp.startsWith(today)).length,
    failedAttempts: credentials ? getLoginAttempts(credentials.lineUsername) : 0,
    totalEvents: events.length
  };
};

// デバイス情報の保存・取得
export const saveDeviceFingerprint = (fingerprint: DeviceFingerprint): void => {
  localStorage.setItem(STORAGE_KEYS.DEVICE_FINGERPRINT, JSON.stringify(fingerprint));
};

export const getDeviceFingerprint = (): DeviceFingerprint | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.DEVICE_FINGERPRINT);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// ユーザー認証情報の保存・取得
export const saveUserCredentials = async (
  lineUsername: string, 
  pinCode: string, 
  deviceId: string
): Promise<void> => {
  const salt = generateSalt();
  const hashedPin = await hashPinCode(pinCode, salt);
  
  const credentials = {
    lineUsername,
    pinCodeHash: hashedPin,
    salt,
    deviceId,
    createdAt: new Date().toISOString()
  };
  
  localStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify(credentials));
};

export const getUserCredentials = (): any | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// 秘密の質問の保存・取得
export const saveSecurityQuestions = (questions: SecurityQuestion[]): void => {
  const questionsWithHash = questions.map(q => ({
    ...q,
    answer: btoa(q.answer.toLowerCase().trim()) // 簡易ハッシュ化
  }));
  
  localStorage.setItem(STORAGE_KEYS.SECURITY_QUESTIONS, JSON.stringify(questionsWithHash));
};

export const getSecurityQuestions = (): SecurityQuestion[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.SECURITY_QUESTIONS);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

// 認証状態の確認
export const isAuthenticated = (): boolean => {
  const session = getAuthSession();
  return session !== null && session.isVerified;
};

// 現在のユーザー情報取得
export const getCurrentUser = (): { lineUsername: string; deviceId: string } | null => {
  const session = getAuthSession();
  if (!session) return null;
  
  return {
    lineUsername: session.lineUsername,
    deviceId: session.deviceId
  };
};

// ログアウト処理
export const logoutUser = (): void => {
  const user = getCurrentUser();
  try {
    if (user) {
      logSecurityEvent('logout', user.lineUsername, 'ユーザーが明示的にログアウトしました');
    }
    clearAuthSession();
  } catch (error) {
    console.error('ログアウト処理エラー:', error);
    // エラーが発生しても確実にセッションをクリア
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
};