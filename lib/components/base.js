'use strict';
import {Component, View, OnInit, CORE_DIRECTIVES} from 'angular2/angular2';
import SchemaManager from '../utils/SchemaManager';
import JsonPointer from '../utils/JsonPointer';
import {MarkedPipe, JsonPointerEscapePipe} from '../utils/pipes';

// common inputs for all components
let commonInputs = ['pointer']; // json pointer to the schema chunk

// internal helper function
function safeConcat(a, b) {
  let res = a && a.slice() || [];
  b = (b == null) ? [] : b;
  return res.concat(b);
}

/**
 * Class decorator
 * Simplifies setup of component metainfo
 * All options are options from either Component or View angular2 decorator
 * For detailed info look angular2 doc
 * @param {Object} options - component options
 * @param {string[]} options.inputs - component inputs
 * @param {*[]} options.directives - directives used by component
 *   (except CORE_DIRECTIVES)
 * @param {*[]} options.pipes - pipes used by component
 * @param {*[]} options.providers - component providers
 * @param {string} options.templateUrl - path to component template
 * @param {string} options.template - component template html
 * @param {string} options.styles - component css styles
 */
export function RedocComponent(options) {
  let inputs = safeConcat(options.inputs, commonInputs);
  let directives = safeConcat(options.directives, CORE_DIRECTIVES);
  let pipes = safeConcat(options.pipes, [JsonPointerEscapePipe, MarkedPipe]);

  return function decorator(target) {

    let componentDecorator = Component({
      selector: options.selector,
      inputs: inputs,
      outputs: options.outputs,
      lifecycle: [OnInit],
      providers: options.providers
    });
    let viewDecorator = View({
      templateUrl: options.templateUrl,
      template: options.template,
      styles: options.styles,
      directives: directives,
      pipes: pipes
    });

    return componentDecorator(viewDecorator(target) || target) || target;
  };
}

/**
 * Generic Component
 * @class
 */
export class BaseComponent {
  constructor(schemaMgr) {
    this.schemaMgr = schemaMgr;
    this.schema = schemaMgr.schema;
    this.componentSchema = null;
  }

  /**
   * onInit method is run by angular2 after all component inputs are resolved
   */
  onInit() {
    this.componentSchema = this.schemaMgr.byPointer(this.pointer || '');
    this.prepareModel();
    this.init();
  }

  /**
   * simple in-place schema dereferencing. Schema is already bundled so no need in global dereferencing.
   * TODO: doesn't support circular references
   */
  dereference(schema = this.componentSchema) {
    if (schema && schema.$ref) {
      let resolved = this.schemaMgr.byPointer(schema.$ref);
      let baseName = JsonPointer.baseName(schema.$ref);
      // if resolved schema doesn't have title use name from ref
      resolved.title = resolved.title || baseName;
      Object.assign(schema, resolved);
      delete schema.$ref;
    }

    Object.keys(schema).forEach((key) => {
      let value = schema[key];
      if (value && typeof value === 'object') {
        this.dereference(value);
      }
    });
  }

  /**
   * Used to prepare model based on component schema
   * @abstract
   */
  prepareModel() {}

  /**
   * Used to initialize component. Run after prepareModel
   * @abstract
   */
  init() {}
}
BaseComponent.parameters = [[SchemaManager]];