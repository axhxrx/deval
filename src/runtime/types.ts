/**
Generic runtime types for Op-based CLI applications

These types are not specific to deval and can be extracted to a library
*/

/**
Types of user input actions for simulated sessions
*/
export type UserInputType = 'select' | 'input' | 'toggle' | 'confirm';

/**
A single user input action
*/
export interface BaseSimulatedUserInput<T extends UserInputType, ValueT>
{
  type: T;
  value: ValueT;
}

export type SimulatedSelect = BaseSimulatedUserInput<'select', number>;

export type SimulatedInput = BaseSimulatedUserInput<'input', string>;

export type SimulatedToggle = BaseSimulatedUserInput<'toggle', boolean>;

export type SimulatedConfirm = BaseSimulatedUserInput<'confirm', 'yes' | 'no' | 'help'>;

export type SimulatedUserInput = SimulatedSelect | SimulatedInput | SimulatedToggle | SimulatedConfirm;

export type SimulatedUserInputTypeMap = {
  select: SimulatedSelect;
  input: SimulatedInput;
  toggle: SimulatedToggle;
  confirm: SimulatedConfirm;
};

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
  Op?: string;
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
