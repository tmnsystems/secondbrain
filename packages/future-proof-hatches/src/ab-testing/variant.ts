/**
 * Variant Class
 * @module ab-testing/variant
 */

import { v4 as uuidv4 } from 'uuid';
import { Variant } from './types';

/**
 * Implementation of the Variant interface
 */
export class VariantImpl implements Variant {
  /** Unique identifier for the variant */
  id: string;
  /** Human-readable name for the variant */
  name: string;
  /** Whether this is the control variant */
  isControl: boolean;
  /** Weight of the variant (for distribution) */
  weight: number;
  /** Value of the variant */
  value: any;
  /** Configuration specific to this variant */
  config?: Record<string, any>;
  
  /**
   * Create a new VariantImpl
   * @param params Variant parameters
   */
  constructor(params: Omit<Variant, 'id'> & { id?: string }) {
    this.id = params.id || uuidv4();
    this.name = params.name;
    this.isControl = params.isControl;
    this.weight = params.weight;
    this.value = params.value;
    this.config = params.config;
    
    // Validate the variant
    this.validate();
  }
  
  /**
   * Validate the variant
   * @throws Error if the variant is invalid
   */
  validate(): void {
    // Variant must have a name
    if (!this.name) {
      throw new Error('Variant must have a name');
    }
    
    // Weight must be between 0 and 100
    if (this.weight < 0 || this.weight > 100) {
      throw new Error('Variant weight must be between 0 and 100');
    }
  }
  
  /**
   * Update the variant
   * @param updates The updates to apply
   * @returns The updated variant
   */
  update(updates: Partial<Variant>): Variant {
    // Update basic properties
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.isControl !== undefined) this.isControl = updates.isControl;
    if (updates.weight !== undefined) this.weight = updates.weight;
    if (updates.value !== undefined) this.value = updates.value;
    if (updates.config !== undefined) this.config = { ...this.config, ...updates.config };
    
    // Validate the updated variant
    this.validate();
    
    return this;
  }
  
  /**
   * Create a control variant
   * @param name The variant name
   * @param value The variant value
   * @param weight The variant weight
   * @param config Optional variant configuration
   * @returns A new control variant
   */
  static createControl(
    name: string = 'Control',
    value: any = null,
    weight: number = 50,
    config?: Record<string, any>
  ): VariantImpl {
    return new VariantImpl({
      name,
      isControl: true,
      weight,
      value,
      config
    });
  }
  
  /**
   * Create a treatment variant
   * @param name The variant name
   * @param value The variant value
   * @param weight The variant weight
   * @param config Optional variant configuration
   * @returns A new treatment variant
   */
  static createTreatment(
    name: string = 'Treatment',
    value: any = true,
    weight: number = 50,
    config?: Record<string, any>
  ): VariantImpl {
    return new VariantImpl({
      name,
      isControl: false,
      weight,
      value,
      config
    });
  }
  
  /**
   * Create multiple variants with equal weights
   * @param values The variant values
   * @param isFirstControl Whether the first variant is the control
   * @returns An array of variants
   */
  static createMultiple(
    values: any[],
    isFirstControl: boolean = true
  ): VariantImpl[] {
    if (values.length === 0) {
      throw new Error('Cannot create variants with no values');
    }
    
    const weight = 100 / values.length;
    
    return values.map((value, index) => {
      const isControl = isFirstControl && index === 0;
      const name = isControl ? 'Control' : `Variant ${String.fromCharCode(65 + index)}`; // A, B, C, ...
      
      return new VariantImpl({
        name,
        isControl,
        weight,
        value
      });
    });
  }
  
  /**
   * Create a variant from an existing variant object
   * @param variant The variant to create from
   * @returns A new variant instance
   */
  static fromExisting(variant: Variant): VariantImpl {
    return new VariantImpl(variant);
  }
}