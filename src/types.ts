/**
 * Type definitions for AI Test Case Generator extension
 */

/**
 * Represents a single test case
 */
export interface TestCase {
    /** Unique identifier for the test case */
    id: string;
    /** Test name/description */
    name: string;
    /** Complete test code */
    code: string;
    /** Test category */
    type: 'normal' | 'edge' | 'error';
    /** Testing framework used */
    framework: string;
}

/**
 * Complete set of generated tests
 */
export interface GeneratedTests {
    /** Programming language */
    language: string;
    /** Testing framework detected/used */
    framework: string;
    /** Array of generated test cases */
    testCases: TestCase[];
    /** Required imports for tests */
    imports: string;
    /** Complete runnable test file */
    fullCode: string;
    /** When generated (timestamp) */
    timestamp: number;
    /** Metadata about test generation */
    metadata?: {
        duplicatesRemoved: number;
        totalGenerated: number;
        uniqueTests: number;
    };
}

/**
 * Extension configuration settings
 */
export interface ExtensionConfig {
    /** AI provider to use */
    apiProvider: 'anthropic' | 'gemini';
    /** API key for the provider */
    apiKey: string;
    /** Model name/version */
    model: string;
    /** Maximum tokens in response */
    maxTokens: number;
    /** Temperature for AI generation */
    temperature: number;
}

/**
 * Supported programming languages
 */
export type SupportedLanguage = 
    | 'javascript' 
    | 'typescript' 
    | 'python' 
    | 'java' 
    | 'go' 
    | 'rust' 
    | 'cpp' 
    | 'csharp'
    | 'ruby'
    | 'php';

/**
 * Mapping of languages to their supported testing frameworks
 */
export interface FrameworkMap {
    [language: string]: string[];
}

/**
 * Represents a code block (function, class, method)
 */
export interface CodeBlock {
    /** Type of code block */
    type: 'function' | 'class' | 'method';
    /** Name of the block */
    name: string;
    /** Code content */
    code: string;
    /** Starting line number */
    startLine: number;
    /** Ending line number */
    endLine: number;
    /** Function parameters */
    params?: string[];
    /** Return type */
    returnType?: string;
}

/**
 * Function parameter information
 */
export interface Parameter {
    /** Parameter name */
    name: string;
    /** Parameter type */
    type?: string;
    /** Whether parameter is optional */
    optional?: boolean;
}

/**
 * Function signature information
 */
export interface FunctionSignature {
    /** Function name */
    name: string;
    /** Function parameters */
    parameters: Parameter[];
    /** Return type */
    returnType: string;
    /** Whether function is async */
    isAsync: boolean;
}

/**
 * Code validation result
 */
export interface ValidationResult {
    /** Whether code is valid */
    valid: boolean;
    /** Error message if invalid */
    error?: string;
}
