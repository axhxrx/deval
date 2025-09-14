/**
Generic runtime types for operation-based CLI applications

These types are not specific to deval and can be extracted to a library
*/

/**
Types of user input actions for simulated sessions
*/
export enum UserInputType
{
  Select = 'select',
  Input = 'input',
  Toggle = 'toggle',
  Confirm = 'confirm',
  Checkbox = 'checkbox',
}

/**
A single user input action
*/
export interface UserInput
{
  type: UserInputType;
  value: string | number | boolean | string[];
}

/**
Metadata for a recorded session
*/
export interface SessionMetadata
{
  timestamp: string;
  duration?: number;
  completedSuccessfully: boolean;
  errorOccurred?: boolean;
  error?: string;
}

/**
A recorded interaction in a session
*/
export interface SessionInteraction
{
  type: UserInputType;
  value: unknown;
  timestamp: number;
  operation?: string;
}

/**
A complete recorded session
*/
export interface RecordedSession
{
  version: string;
  timestamp: string;
  interactions: SessionInteraction[];
  metadata?: SessionMetadata;
}
