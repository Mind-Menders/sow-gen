import { MongoClient, Db, Collection } from "mongodb";

export interface AccessRule {
  userType: 'creator' | 'current_reviewer' | 'admin' | 'other';
  draft: boolean;
  pending_review: boolean;
  in_review: boolean;
  ready_for_submission: boolean;
}

export interface AccessControlConfig {
  _id?: string;
  version: number;
  rules: AccessRule[];
  updatedAt: Date;
  updatedBy: string;
}

const DEFAULT_ACCESS_RULES: AccessRule[] = [
  {
    userType: 'creator',
    draft: true,
    pending_review: true,
    in_review: true,
    ready_for_submission: false,
  },
  {
    userType: 'current_reviewer',
    draft: false,
    pending_review: true,
    in_review: true,
    ready_for_submission: false,
  },
  {
    userType: 'admin',
    draft: true,
    pending_review: true,
    in_review: true,
    ready_for_submission: false,
  },
  {
    userType: 'other',
    draft: false,
    pending_review: false,
    in_review: false,
    ready_for_submission: false,
  },
];

let accessControlCollection: Collection<AccessControlConfig> | null = null;

export function initializeAccessControl(db: Db) {
  accessControlCollection = db.collection<AccessControlConfig>('access_control');
  
  // Create index
  accessControlCollection.createIndex({ version: -1 });
}

export async function getAccessControlConfig(): Promise<AccessControlConfig> {
  if (!accessControlCollection) {
    throw new Error('Access control collection not initialized');
  }

  // Get the latest version
  const config = await accessControlCollection
    .find()
    .sort({ version: -1 })
    .limit(1)
    .toArray();

  if (config.length === 0) {
    // Create default config
    const defaultConfig: AccessControlConfig = {
      version: 1,
      rules: DEFAULT_ACCESS_RULES,
      updatedAt: new Date(),
      updatedBy: 'system',
    };
    
    await accessControlCollection.insertOne(defaultConfig);
    return defaultConfig;
  }

  return config[0];
}

export async function updateAccessControlConfig(
  rules: AccessRule[],
  updatedBy: string
): Promise<AccessControlConfig> {
  if (!accessControlCollection) {
    throw new Error('Access control collection not initialized');
  }

  const currentConfig = await getAccessControlConfig();
  
  const newConfig: AccessControlConfig = {
    version: currentConfig.version + 1,
    rules,
    updatedAt: new Date(),
    updatedBy,
  };

  await accessControlCollection.insertOne(newConfig);
  
  return newConfig;
}

export async function getAccessControlHistory(): Promise<AccessControlConfig[]> {
  if (!accessControlCollection) {
    throw new Error('Access control collection not initialized');
  }

  return await accessControlCollection
    .find()
    .sort({ version: -1 })
    .toArray();
}

export function canUserEditSow(
  config: AccessControlConfig,
  userType: 'creator' | 'current_reviewer' | 'admin' | 'other',
  sowStatus: string
): boolean {
  const rule = config.rules.find(r => r.userType === userType);
  if (!rule) return false;

  // Normalize status
  const status = sowStatus as keyof Omit<AccessRule, 'userType'>;
  
  return rule[status] ?? false;
}
