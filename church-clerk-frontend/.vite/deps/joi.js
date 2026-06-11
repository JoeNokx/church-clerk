import {
  __commonJS
} from "./chunk-G3PMV62Z.js";

// node_modules/joi/dist/joi-browser.min.js
var require_joi_browser_min = __commonJS({
  "node_modules/joi/dist/joi-browser.min.js"(exports, module) {
    !(function(e, t) {
      "object" == typeof exports && "object" == typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define([], t) : "object" == typeof exports ? exports.joi = t() : e.joi = t();
    })(self, () => (() => {
      var e = { 2115(e2, t2, r2) {
        "use strict";
        const { assert: s, clone: n, deepEqual: a, merge: i } = r2(3115), o = r2(2130), l = r2(9415), c = r2(3541), u = r2(8013), f = r2(2062), m = r2(9017), h = r2(6162), p = r2(5844), d = r2(8529), g = r2(125), y = r2(1190), b = r2(6220), v = { standardTypes: /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "object", "array", "null"]), jsonSchemaTarget: "draft-2020-12", primitiveTypes: /* @__PURE__ */ new Set(["string", "number", "boolean"]), nullSchema: () => ({ type: "null" }), Base: class {
          constructor(e3) {
            this.type = e3, this.$_root = null, this._definition = {}, this._reset();
          }
          _reset() {
            this._ids = new p.Ids(), this._preferences = null, this._refs = new d.Manager(), this._cache = null, this._valids = null, this._invalids = null, this._flags = {}, this._rules = [], this._singleRules = /* @__PURE__ */ new Map(), this.$_terms = {}, this.$_temp = { ruleset: null, whens: {} };
          }
          describe() {
            return s("function" == typeof m.describe, "Manifest functionality disabled"), m.describe(this);
          }
          $_jsonSchema(e3, t3 = {}) {
            var r3;
            if (void 0 !== t3.target && t3.target !== v.jsonSchemaTarget) throw new Error(`Unsupported JSON Schema target: ${t3.target}`);
            const s2 = !t3.$defs, n2 = null !== (r3 = t3.$defs) && void 0 !== r3 ? r3 : {};
            let i2 = {};
            const o2 = "any" === this.type, c2 = this._flags.only, u2 = this._valids && Array.from(this._valids._values).filter((e4) => null !== e4);
            let f2 = true;
            if (u2 && u2.length && c2 && !o2) {
              const e4 = new Set(u2.map((e5) => typeof e5));
              f2 = e4.has(this.type) || "date" === this.type && e4.has("object");
            }
            !o2 && f2 && v.standardTypes.has(this.type) && (i2.type = this.type), this._flags.description && (i2.description = this._flags.description), void 0 !== this._flags.default && "function" != typeof this._flags.default && (i2.default = this._flags.default);
            const m2 = { ...t3, $defs: n2 };
            this._definition.jsonSchema && f2 && (i2 = this._definition.jsonSchema(this, i2, e3, m2));
            for (const t4 of this._rules) {
              const r4 = this._definition.rules[t4.name];
              r4.jsonSchema && f2 && (i2 = r4.jsonSchema(t4, i2, c2, e3, m2));
            }
            if (this.$_terms.shared) for (const t4 of this.$_terms.shared) n2[t4._flags.id] = t4.$_jsonSchema(e3, m2);
            if (s2 && Object.keys(n2).length && (i2.$defs = n2), this._valids) {
              const e4 = u2.filter((e5) => "symbol" != typeof e5);
              if (e4.length) if (this._flags.only) {
                i2.enum = e4;
                const t4 = l.intersect(new Set(e4.map((e5) => typeof e5)), v.primitiveTypes);
                if (t4.size) {
                  const e5 = [...t4];
                  i2.type = 1 === e5.length ? e5[0] : e5;
                }
              } else {
                const t4 = e4.filter((e5) => typeof e5 !== this.type || o2);
                !t4.length || o2 && !c2 || (i2.anyOf || (i2 = { anyOf: [i2] }), i2.anyOf.push({ enum: t4 }));
              }
            }
            if (this._valids && this._valids.has(null) && (!o2 || c2) && (1 === this._valids.length && (o2 || c2) ? i2.type = "null" : i2.type ? i2.type = [i2.type, "null"] : i2.anyOf ? i2.anyOf.unshift(v.nullSchema()) : i2 = { anyOf: [v.nullSchema(), i2] }), this.$_terms.whens) {
              const t4 = this.clone();
              t4.$_terms.whens = null;
              const r4 = [];
              for (const s4 of this.$_terms.whens) {
                const n3 = s4.is ? [s4] : s4.switch;
                for (let s5 = 0; s5 < n3.length; ++s5) {
                  const a2 = n3[s5];
                  a2.then && r4.push(t4.concat(a2.then).$_jsonSchema(e3, m2)), a2.otherwise && r4.push(t4.concat(a2.otherwise).$_jsonSchema(e3, m2)), a2.then && (s5 !== n3.length - 1 || a2.otherwise) || r4.push(t4.$_jsonSchema(e3, m2));
                }
              }
              const s3 = [];
              for (const e4 of r4) s3.some((t5) => a(t5, e4)) || s3.push(e4);
              return { anyOf: s3 };
            }
            return i2;
          }
          allow(...e3) {
            return l.verifyFlat(e3, "allow"), this._values(e3, "_valids");
          }
          alter(e3) {
            s(e3 && "object" == typeof e3 && !Array.isArray(e3), "Invalid targets argument"), s(!this._inRuleset(), "Cannot set alterations inside a ruleset");
            const t3 = this.clone();
            t3.$_terms.alterations = t3.$_terms.alterations || [];
            for (const r3 in e3) {
              const n2 = e3[r3];
              s("function" == typeof n2, "Alteration adjuster for", r3, "must be a function"), t3.$_terms.alterations.push({ target: r3, adjuster: n2 });
            }
            return t3.$_temp.ruleset = false, t3;
          }
          artifact(e3) {
            return s(void 0 !== e3, "Artifact cannot be undefined"), s(!this._cache, "Cannot set an artifact with a rule cache"), this.$_setFlag("artifact", e3);
          }
          cast(e3) {
            return s(false === e3 || "string" == typeof e3, "Invalid to value"), s(false === e3 || this._definition.cast[e3], "Type", this.type, "does not support casting to", e3), this.$_setFlag("cast", false === e3 ? void 0 : e3);
          }
          default(e3, t3) {
            return this._default("default", e3, t3);
          }
          description(e3) {
            return s(e3 && "string" == typeof e3, "Description must be a non-empty string"), this.$_setFlag("description", e3);
          }
          empty(e3) {
            const t3 = this.clone();
            return void 0 !== e3 && (e3 = t3.$_compile(e3, { override: false })), t3.$_setFlag("empty", e3, { clone: false });
          }
          error(e3) {
            return s(e3, "Missing error"), s(e3 instanceof Error || "function" == typeof e3, "Must provide a valid Error object or a function"), this.$_setFlag("error", e3);
          }
          example(e3, t3 = {}) {
            return s(void 0 !== e3, "Missing example"), l.assertOptions(t3, ["override"]), this._inner("examples", e3, { single: true, override: t3.override });
          }
          external(e3, t3) {
            return "object" == typeof e3 && (s(!t3, "Cannot combine options with description"), t3 = e3.description, e3 = e3.method), s("function" == typeof e3, "Method must be a function"), s(void 0 === t3 || t3 && "string" == typeof t3, "Description must be a non-empty string"), this._inner("externals", { method: e3, description: t3 }, { single: true });
          }
          failover(e3, t3) {
            return this._default("failover", e3, t3);
          }
          forbidden() {
            return this.presence("forbidden");
          }
          id(e3) {
            return e3 ? (s("string" == typeof e3, "id must be a non-empty string"), s(/^[^\.]+$/.test(e3), "id cannot contain period character"), this.$_setFlag("id", e3)) : this.$_setFlag("id", void 0);
          }
          invalid(...e3) {
            return this._values(e3, "_invalids");
          }
          label(e3) {
            return s(e3 && "string" == typeof e3, "Label name must be a non-empty string"), this.$_setFlag("label", e3);
          }
          meta(e3) {
            return s(void 0 !== e3, "Meta cannot be undefined"), this._inner("metas", e3, { single: true });
          }
          note(...e3) {
            s(e3.length, "Missing notes");
            for (const t3 of e3) s(t3 && "string" == typeof t3, "Notes must be non-empty strings");
            return this._inner("notes", e3);
          }
          only(e3 = true) {
            return s("boolean" == typeof e3, "Invalid mode:", e3), this.$_setFlag("only", e3);
          }
          optional() {
            return this.presence("optional");
          }
          prefs(e3) {
            s(e3, "Missing preferences"), s(void 0 === e3.context, "Cannot override context"), s(void 0 === e3.externals, "Cannot override externals"), s(void 0 === e3.warnings, "Cannot override warnings"), s(void 0 === e3.debug, "Cannot override debug"), l.checkPreferences(e3);
            const t3 = this.clone();
            return t3._preferences = l.preferences(t3._preferences, e3), t3;
          }
          presence(e3) {
            return s(["optional", "required", "forbidden"].includes(e3), "Unknown presence mode", e3), this.$_setFlag("presence", e3);
          }
          raw(e3 = true) {
            return this.$_setFlag("result", e3 ? "raw" : void 0);
          }
          result(e3) {
            return s(["raw", "strip"].includes(e3), "Unknown result mode", e3), this.$_setFlag("result", e3);
          }
          required() {
            return this.presence("required");
          }
          strict(e3) {
            const t3 = this.clone(), r3 = void 0 !== e3 && !e3;
            return t3._preferences = l.preferences(t3._preferences, { convert: r3 }), t3;
          }
          strip(e3 = true) {
            return this.$_setFlag("result", e3 ? "strip" : void 0);
          }
          tag(...e3) {
            s(e3.length, "Missing tags");
            for (const t3 of e3) s(t3 && "string" == typeof t3, "Tags must be non-empty strings");
            return this._inner("tags", e3);
          }
          unit(e3) {
            return s(e3 && "string" == typeof e3, "Unit name must be a non-empty string"), this.$_setFlag("unit", e3);
          }
          valid(...e3) {
            l.verifyFlat(e3, "valid");
            const t3 = this.allow(...e3);
            return t3.$_setFlag("only", !!t3._valids, { clone: false }), t3;
          }
          when(e3, t3) {
            const r3 = this.clone();
            r3.$_terms.whens || (r3.$_terms.whens = []);
            const n2 = c.when(r3, e3, t3);
            if (!["any", "link"].includes(r3.type)) {
              const e4 = n2.is ? [n2] : n2.switch;
              for (const t4 of e4) s(!t4.then || "any" === t4.then.type || t4.then.type === r3.type, "Cannot combine", r3.type, "with", t4.then && t4.then.type), s(!t4.otherwise || "any" === t4.otherwise.type || t4.otherwise.type === r3.type, "Cannot combine", r3.type, "with", t4.otherwise && t4.otherwise.type);
            }
            return r3.$_terms.whens.push(n2), r3.$_mutateRebuild();
          }
          cache(e3) {
            s(!this._inRuleset(), "Cannot set caching inside a ruleset"), s(!this._cache, "Cannot override schema cache"), s(void 0 === this._flags.artifact, "Cannot cache a rule with an artifact");
            const t3 = this.clone();
            return t3._cache = e3 || o.provider.provision(), t3.$_temp.ruleset = false, t3;
          }
          clone() {
            const e3 = Object.create(Object.getPrototypeOf(this));
            return this._assign(e3);
          }
          concat(e3) {
            s(l.isSchema(e3), "Invalid schema object"), s("any" === this.type || "any" === e3.type || e3.type === this.type, "Cannot merge type", this.type, "with another type:", e3.type), s(!this._inRuleset(), "Cannot concatenate onto a schema with open ruleset"), s(!e3._inRuleset(), "Cannot concatenate a schema with open ruleset");
            let t3 = this.clone();
            if ("any" === this.type && "any" !== e3.type) {
              const r3 = e3.clone();
              for (const e4 of Object.keys(t3)) "type" !== e4 && (r3[e4] = t3[e4]);
              t3 = r3;
            }
            t3._ids.concat(e3._ids), t3._refs.register(e3, d.toSibling), t3._preferences = t3._preferences ? l.preferences(t3._preferences, e3._preferences) : e3._preferences, t3._valids = b.merge(t3._valids, e3._valids, e3._invalids), t3._invalids = b.merge(t3._invalids, e3._invalids, e3._valids);
            for (const r3 of e3._singleRules.keys()) t3._singleRules.has(r3) && (t3._rules = t3._rules.filter((e4) => e4.keep || e4.name !== r3), t3._singleRules.delete(r3));
            for (const r3 of e3._rules) e3._definition.rules[r3.method].multi || t3._singleRules.set(r3.name, r3), t3._rules.push(r3);
            if (t3._flags.empty && e3._flags.empty) {
              t3._flags.empty = t3._flags.empty.concat(e3._flags.empty);
              const r3 = Object.assign({}, e3._flags);
              delete r3.empty, i(t3._flags, r3);
            } else if (e3._flags.empty) {
              t3._flags.empty = e3._flags.empty;
              const r3 = Object.assign({}, e3._flags);
              delete r3.empty, i(t3._flags, r3);
            } else i(t3._flags, e3._flags);
            for (const r3 in e3.$_terms) {
              const s2 = e3.$_terms[r3];
              s2 ? t3.$_terms[r3] ? t3.$_terms[r3] = t3.$_terms[r3].concat(s2) : t3.$_terms[r3] = s2.slice() : t3.$_terms[r3] || (t3.$_terms[r3] = s2);
            }
            return this.$_root._tracer && this.$_root._tracer._combine(t3, [this, e3]), t3.$_mutateRebuild();
          }
          extend(e3) {
            return s(!e3.base, "Cannot extend type with another base"), f.type(this, e3);
          }
          extract(e3) {
            return e3 = Array.isArray(e3) ? e3 : e3.split("."), this._ids.reach(e3);
          }
          fork(e3, t3) {
            s(!this._inRuleset(), "Cannot fork inside a ruleset");
            let r3 = this;
            for (let s2 of [].concat(e3)) s2 = Array.isArray(s2) ? s2 : s2.split("."), r3 = r3._ids.fork(s2, t3, r3);
            return r3.$_temp.ruleset = false, r3;
          }
          isAsync() {
            var e3;
            if (Boolean(null === (e3 = this.$_terms.externals) || void 0 === e3 ? void 0 : e3.length)) return true;
            if (this.$_terms.whens) for (const e4 of this.$_terms.whens) {
              var t3, r3;
              if (null !== (t3 = e4.then) && void 0 !== t3 && t3.isAsync()) return true;
              if (null !== (r3 = e4.otherwise) && void 0 !== r3 && r3.isAsync()) return true;
              if (e4.switch) for (const t4 of e4.switch) {
                var s2, n2;
                if (null !== (s2 = t4.then) && void 0 !== s2 && s2.isAsync()) return true;
                if (null !== (n2 = t4.otherwise) && void 0 !== n2 && n2.isAsync()) return true;
              }
            }
            return false;
          }
          rule(e3) {
            const t3 = this._definition;
            l.assertOptions(e3, Object.keys(t3.modifiers)), s(false !== this.$_temp.ruleset, "Cannot apply rules to empty ruleset or the last rule added does not support rule properties");
            const r3 = null === this.$_temp.ruleset ? this._rules.length - 1 : this.$_temp.ruleset;
            s(r3 >= 0 && r3 < this._rules.length, "Cannot apply rules to empty ruleset");
            const a2 = this.clone();
            for (let i2 = r3; i2 < a2._rules.length; ++i2) {
              const r4 = a2._rules[i2], o2 = n(r4);
              for (const n2 in e3) t3.modifiers[n2](o2, e3[n2]), s(o2.name === r4.name, "Cannot change rule name");
              a2._rules[i2] = o2, a2._singleRules.get(o2.name) === r4 && a2._singleRules.set(o2.name, o2);
            }
            return a2.$_temp.ruleset = false, a2.$_mutateRebuild();
          }
          get ruleset() {
            s(!this._inRuleset(), "Cannot start a new ruleset without closing the previous one");
            const e3 = this.clone();
            return e3.$_temp.ruleset = e3._rules.length, e3;
          }
          get $() {
            return this.ruleset;
          }
          tailor(e3) {
            e3 = [].concat(e3), s(!this._inRuleset(), "Cannot tailor inside a ruleset");
            let t3 = this;
            if (this.$_terms.alterations) for (const { target: r3, adjuster: n2 } of this.$_terms.alterations) e3.includes(r3) && (t3 = n2(t3), s(l.isSchema(t3), "Alteration adjuster for", r3, "failed to return a schema object"));
            return t3 = t3.$_modify({ each: (t4) => t4.tailor(e3), ref: false }), t3.$_temp.ruleset = false, t3.$_mutateRebuild();
          }
          tracer() {
            return g.location ? g.location(this) : this;
          }
          validate(e3, t3) {
            return y.entry(e3, this, t3);
          }
          validateAsync(e3, t3) {
            return y.entryAsync(e3, this, t3);
          }
          $_addRule(e3) {
            "string" == typeof e3 && (e3 = { name: e3 }), s(e3 && "object" == typeof e3, "Invalid options"), s(e3.name && "string" == typeof e3.name, "Invalid rule name");
            for (const t4 in e3) s("_" !== t4[0], "Cannot set private rule properties");
            const t3 = Object.assign({}, e3);
            t3._resolve = [], t3.method = t3.method || t3.name;
            const r3 = this._definition.rules[t3.method], n2 = t3.args;
            s(r3, "Unknown rule", t3.method);
            const a2 = this.clone();
            if (n2) {
              s(1 === Object.keys(n2).length || Object.keys(n2).length === this._definition.rules[t3.name].args.length, "Invalid rule definition for", this.type, t3.name);
              for (const e4 in n2) {
                let i2 = n2[e4];
                if (r3.argsByName) {
                  const o2 = r3.argsByName.get(e4);
                  if (o2.ref && l.isResolvable(i2)) t3._resolve.push(e4), a2.$_mutateRegister(i2);
                  else if (o2.normalize && (i2 = o2.normalize(i2), n2[e4] = i2), o2.assert) {
                    const t4 = l.validateArg(i2, e4, o2);
                    s(!t4, t4, "or reference");
                  }
                }
                void 0 !== i2 ? n2[e4] = i2 : delete n2[e4];
              }
            }
            return r3.multi || (a2._ruleRemove(t3.name, { clone: false }), a2._singleRules.set(t3.name, t3)), false === a2.$_temp.ruleset && (a2.$_temp.ruleset = null), r3.priority ? a2._rules.unshift(t3) : a2._rules.push(t3), a2;
          }
          $_compile(e3, t3) {
            return c.schema(this.$_root, e3, t3);
          }
          $_createError(e3, t3, r3, s2, n2, a2 = {}) {
            const i2 = false !== a2.flags ? this._flags : {}, o2 = a2.messages ? h.merge(this._definition.messages, a2.messages) : this._definition.messages;
            return new u.Report(e3, t3, r3, i2, o2, s2, n2);
          }
          $_getFlag(e3) {
            return this._flags[e3];
          }
          $_getRule(e3) {
            return this._singleRules.get(e3);
          }
          $_mapLabels(e3) {
            return e3 = Array.isArray(e3) ? e3 : e3.split("."), this._ids.labels(e3);
          }
          $_match(e3, t3, r3, s2) {
            (r3 = Object.assign({}, r3)).abortEarly = true, r3._externals = false, t3.snapshot();
            const n2 = !y.validate(e3, this, t3, r3, s2).errors;
            return t3.restore(), n2;
          }
          $_modify(e3) {
            return l.assertOptions(e3, ["each", "once", "ref", "schema"]), p.schema(this, e3) || this;
          }
          $_mutateRebuild() {
            return s(!this._inRuleset(), "Cannot add this rule inside a ruleset"), this._refs.reset(), this._ids.reset(), this.$_modify({ each: (e3, { source: t3, name: r3, path: s2, key: n2 }) => {
              const a2 = this._definition[t3][r3] && this._definition[t3][r3].register;
              false !== a2 && this.$_mutateRegister(e3, { family: a2, key: n2 });
            } }), this._definition.rebuild && this._definition.rebuild(this), this.$_temp.ruleset = false, this;
          }
          $_mutateRegister(e3, { family: t3, key: r3 } = {}) {
            this._refs.register(e3, t3), this._ids.register(e3, { key: r3 });
          }
          $_property(e3) {
            return this._definition.properties[e3];
          }
          $_reach(e3) {
            return this._ids.reach(e3);
          }
          $_rootReferences() {
            return this._refs.roots();
          }
          $_setFlag(e3, t3, r3 = {}) {
            s("_" === e3[0] || !this._inRuleset(), "Cannot set flag inside a ruleset");
            const n2 = this._definition.flags[e3] || {};
            if (a(t3, n2.default) && (t3 = void 0), a(t3, this._flags[e3])) return this;
            const i2 = false !== r3.clone ? this.clone() : this;
            return void 0 !== t3 ? (i2._flags[e3] = t3, i2.$_mutateRegister(t3)) : delete i2._flags[e3], "_" !== e3[0] && (i2.$_temp.ruleset = false), i2;
          }
          $_parent(e3, ...t3) {
            return this[e3][l.symbols.parent].call(this, ...t3);
          }
          $_validate(e3, t3, r3) {
            return y.validate(e3, this, t3, r3);
          }
          _assign(e3) {
            e3.type = this.type, e3.$_root = this.$_root, e3.$_temp = Object.assign({}, this.$_temp), e3.$_temp.whens = {}, e3._ids = this._ids.clone(), e3._preferences = this._preferences, e3._valids = this._valids && this._valids.clone(), e3._invalids = this._invalids && this._invalids.clone(), e3._rules = this._rules.slice(), e3._singleRules = n(this._singleRules, { shallow: true }), e3._refs = this._refs.clone(), e3._flags = Object.assign({}, this._flags), e3._cache = null, e3.$_terms = {};
            for (const t3 in this.$_terms) e3.$_terms[t3] = this.$_terms[t3] ? this.$_terms[t3].slice() : null;
            e3.$_super = {};
            for (const t3 in this.$_super) e3.$_super[t3] = this._super[t3].bind(e3);
            return e3;
          }
          _bare() {
            const e3 = this.clone();
            e3._reset();
            const t3 = e3._definition.terms;
            for (const r3 in t3) {
              const s2 = t3[r3];
              e3.$_terms[r3] = s2.init;
            }
            return e3.$_mutateRebuild();
          }
          _default(e3, t3, r3 = {}) {
            return l.assertOptions(r3, "literal"), s(void 0 !== t3, "Missing", e3, "value"), s("function" == typeof t3 || !r3.literal, "Only function value supports literal option"), "function" == typeof t3 && r3.literal && (t3 = { [l.symbols.literal]: true, literal: t3 }), this.$_setFlag(e3, t3);
          }
          _generate(e3, t3, r3) {
            if (!this.$_terms.whens) return { schema: this };
            const s2 = [], n2 = [];
            for (let a3 = 0; a3 < this.$_terms.whens.length; ++a3) {
              const i3 = this.$_terms.whens[a3];
              if (i3.concat) {
                s2.push(i3.concat), n2.push(`${a3}.concat`);
                continue;
              }
              const o2 = i3.ref ? i3.ref.resolve(e3, t3, r3) : e3, l2 = i3.is ? [i3] : i3.switch, c2 = n2.length;
              for (let c3 = 0; c3 < l2.length; ++c3) {
                const { is: u2, then: f2, otherwise: m2 } = l2[c3], h2 = `${a3}${i3.switch ? "." + c3 : ""}`;
                if (u2.$_match(o2, t3.nest(u2, `${h2}.is`), r3)) {
                  if (f2) {
                    const a4 = t3.localize([...t3.path, `${h2}.then`], t3.ancestors, t3.schemas), { schema: i4, id: o3 } = f2._generate(e3, a4, r3);
                    s2.push(i4), n2.push(`${h2}.then${o3 ? `(${o3})` : ""}`);
                    break;
                  }
                } else if (m2) {
                  const a4 = t3.localize([...t3.path, `${h2}.otherwise`], t3.ancestors, t3.schemas), { schema: i4, id: o3 } = m2._generate(e3, a4, r3);
                  s2.push(i4), n2.push(`${h2}.otherwise${o3 ? `(${o3})` : ""}`);
                  break;
                }
              }
              if (i3.break && n2.length > c2) break;
            }
            const a2 = n2.join(", ");
            if (t3.mainstay.tracer.debug(t3, "rule", "when", a2), !a2) return { schema: this };
            if (!t3.mainstay.tracer.active && this.$_temp.whens[a2]) return { schema: this.$_temp.whens[a2], id: a2 };
            let i2 = this;
            this._definition.generate && (i2 = this._definition.generate(this, e3, t3, r3));
            for (const e4 of s2) i2 = i2.concat(e4);
            return this.$_root._tracer && this.$_root._tracer._combine(i2, [this, ...s2]), this.$_temp.whens[a2] = i2, { schema: i2, id: a2 };
          }
          _inner(e3, t3, r3 = {}) {
            s(!this._inRuleset(), `Cannot set ${e3} inside a ruleset`);
            const n2 = this.clone();
            return n2.$_terms[e3] && !r3.override || (n2.$_terms[e3] = []), r3.single ? n2.$_terms[e3].push(t3) : n2.$_terms[e3].push(...t3), n2.$_temp.ruleset = false, n2;
          }
          _inRuleset() {
            return null !== this.$_temp.ruleset && false !== this.$_temp.ruleset;
          }
          _ruleRemove(e3, t3 = {}) {
            if (!this._singleRules.has(e3)) return this;
            const r3 = false !== t3.clone ? this.clone() : this;
            r3._singleRules.delete(e3);
            const s2 = [];
            for (let t4 = 0; t4 < r3._rules.length; ++t4) {
              const n2 = r3._rules[t4];
              n2.name !== e3 || n2.keep ? s2.push(n2) : r3._inRuleset() && t4 < r3.$_temp.ruleset && --r3.$_temp.ruleset;
            }
            return r3._rules = s2, r3;
          }
          _values(e3, t3) {
            l.verifyFlat(e3, t3.slice(1, -1));
            const r3 = this.clone(), n2 = e3[0] === l.symbols.override;
            if (n2 && (e3 = e3.slice(1)), !r3[t3] && e3.length ? r3[t3] = new b() : n2 && (r3[t3] = e3.length ? new b() : null, r3.$_mutateRebuild()), !r3[t3]) return r3;
            n2 && r3[t3].override();
            for (const n3 of e3) {
              s(void 0 !== n3, "Cannot call allow/valid/invalid with undefined"), s(n3 !== l.symbols.override, "Override must be the first value");
              const e4 = "_invalids" === t3 ? "_valids" : "_invalids";
              r3[e4] && (r3[e4].remove(n3), r3[e4].length || (s("_valids" === t3 || !r3._flags.only, "Setting invalid value", n3, "leaves schema rejecting all values due to previous valid rule"), r3[e4] = null)), r3[t3].add(n3, r3._refs);
            }
            return r3;
          }
          get "~standard"() {
            const e3 = (e4) => {
              let t4;
              return t4 = u.ValidationError.isError(e4) ? e4.details.map(({ message: e5, path: t5 }) => ({ message: e5, path: t5 })) : [{ message: e4.message }], { issues: t4 };
            }, t3 = (e4) => ({ value: e4 });
            return { version: 1, vendor: "joi", validate: (r3, s2) => {
              const n2 = y.standard(r3, this, s2);
              return n2 instanceof Promise ? n2.then(t3, e3) : n2.error ? e3(n2.error) : t3(n2.value);
            }, jsonSchema: { input: (e4) => this.$_jsonSchema("input", e4), output: (e4) => this.$_jsonSchema("output", e4) } };
          }
        } };
        v.Base.prototype[l.symbols.any] = { version: l.version, compile: c.compile, root: "$_root" }, v.Base.prototype.isImmutable = true, v.Base.prototype.deny = v.Base.prototype.invalid, v.Base.prototype.disallow = v.Base.prototype.invalid, v.Base.prototype.equal = v.Base.prototype.valid, v.Base.prototype.exist = v.Base.prototype.required, v.Base.prototype.not = v.Base.prototype.invalid, v.Base.prototype.options = v.Base.prototype.prefs, v.Base.prototype.preferences = v.Base.prototype.prefs, e2.exports = new v.Base();
      }, 2130(e2, t2, r2) {
        "use strict";
        const { assert: s, clone: n } = r2(3115), a = r2(9415), i = { max: 1e3, supported: /* @__PURE__ */ new Set(["undefined", "boolean", "number", "string"]) };
        t2.provider = { provision: (e3) => new i.Cache(e3) }, i.Cache = class {
          constructor(e3 = {}) {
            a.assertOptions(e3, ["max"]), s(void 0 === e3.max || e3.max && e3.max > 0 && isFinite(e3.max), "Invalid max cache size"), this._max = e3.max || i.max, this._map = /* @__PURE__ */ new Map(), this._list = new i.List();
          }
          get length() {
            return this._map.size;
          }
          set(e3, t3) {
            if (null !== e3 && !i.supported.has(typeof e3)) return;
            let r3 = this._map.get(e3);
            if (r3) return r3.value = t3, void this._list.first(r3);
            r3 = this._list.unshift({ key: e3, value: t3 }), this._map.set(e3, r3), this._compact();
          }
          get(e3) {
            const t3 = this._map.get(e3);
            if (t3) return this._list.first(t3), n(t3.value);
          }
          _compact() {
            if (this._map.size > this._max) {
              const e3 = this._list.pop();
              this._map.delete(e3.key);
            }
          }
        }, i.List = class {
          constructor() {
            this.tail = null, this.head = null;
          }
          unshift(e3) {
            return e3.next = null, e3.prev = this.head, this.head && (this.head.next = e3), this.head = e3, this.tail || (this.tail = e3), e3;
          }
          first(e3) {
            e3 !== this.head && (this._remove(e3), this.unshift(e3));
          }
          pop() {
            return this._remove(this.tail);
          }
          _remove(e3) {
            const { next: t3, prev: r3 } = e3;
            return t3.prev = r3, r3 && (r3.next = t3), e3 === this.tail && (this.tail = t3), e3.prev = null, e3.next = null, e3;
          }
        };
      }, 9415(e2, t2, r2) {
        "use strict";
        const { assert: s, AssertError: n } = r2(3115), a = r2(6913);
        let i, o;
        const l = { isoDate: /^(?:[-+]\d{2})?(?:\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?![T]$|[T][\d]+Z$)(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24\:?00)(?:[.,]\d+(?!:))?)(?:\2[0-5]\d(?:[.,]\d+)?)?(?:[Z]|(?:[+-])(?:[01]\d|2[0-3])(?::?[0-5]\d)?)?)?)?$/ };
        t2.version = a.version, t2.defaults = { abortEarly: true, allowUnknown: false, artifacts: false, cache: true, context: null, convert: true, dateFormat: "iso", errors: { escapeHtml: false, label: "path", language: null, render: true, stack: false, wrap: { label: '"', array: "[]" } }, externals: true, messages: {}, nonEnumerables: false, noDefaults: false, presence: "optional", skipFunctions: false, stripUnknown: false, warnings: false }, t2.symbols = { any: /* @__PURE__ */ Symbol.for("@hapi/joi/schema"), arraySingle: /* @__PURE__ */ Symbol("arraySingle"), deepDefault: /* @__PURE__ */ Symbol("deepDefault"), errors: /* @__PURE__ */ Symbol("errors"), literal: /* @__PURE__ */ Symbol("literal"), override: /* @__PURE__ */ Symbol("override"), parent: /* @__PURE__ */ Symbol("parent"), prefs: /* @__PURE__ */ Symbol("prefs"), ref: /* @__PURE__ */ Symbol("ref"), template: /* @__PURE__ */ Symbol("template"), values: /* @__PURE__ */ Symbol("values") }, t2.assertOptions = function(e3, t3, r3 = "Options") {
          s(e3 && "object" == typeof e3 && !Array.isArray(e3), "Options must be of type object");
          const n2 = Object.keys(e3).filter((e4) => !t3.includes(e4));
          s(0 === n2.length, `${r3} contain unknown keys: ${n2}`);
        }, t2.checkPreferences = function(e3) {
          o = o || r2(1688);
          const t3 = o.preferences.validate(e3);
          if (t3.error) throw new n([t3.error.details[0].message]);
        }, t2.compare = function(e3, t3, r3) {
          switch (r3) {
            case "=":
              return e3 === t3;
            case ">":
              return e3 > t3;
            case "<":
              return e3 < t3;
            case ">=":
              return e3 >= t3;
            case "<=":
              return e3 <= t3;
          }
        }, t2.default = function(e3, t3) {
          return void 0 === e3 ? t3 : e3;
        }, t2.intersect = function(e3, t3) {
          if ("function" == typeof e3.intersection) return e3.intersection(t3);
          const r3 = /* @__PURE__ */ new Set();
          for (const s2 of e3) t3.has(s2) && r3.add(s2);
          return r3;
        }, t2.isIsoDate = function(e3) {
          return l.isoDate.test(e3);
        }, t2.isNumber = function(e3) {
          return "number" == typeof e3 && !isNaN(e3);
        }, t2.isResolvable = function(e3) {
          return !!e3 && (e3[t2.symbols.ref] || e3[t2.symbols.template]);
        }, t2.isSchema = function(e3, r3 = {}) {
          const n2 = e3 && e3[t2.symbols.any];
          return !!n2 && (s(r3.legacy || n2.version === t2.version, "Cannot mix different versions of joi schemas"), true);
        }, t2.isValues = function(e3) {
          return e3[t2.symbols.values];
        }, t2.limit = function(e3) {
          return Number.isSafeInteger(e3) && e3 >= 0;
        }, t2.preferences = function(e3, s2) {
          i = i || r2(6162), e3 = e3 || {}, s2 = s2 || {};
          const n2 = Object.assign({}, e3, s2);
          return s2.errors && e3.errors && (n2.errors = Object.assign({}, e3.errors, s2.errors), n2.errors.wrap = Object.assign({}, e3.errors.wrap, s2.errors.wrap)), s2.messages && (n2.messages = i.compile(s2.messages, e3.messages)), delete n2[t2.symbols.prefs], n2;
        }, t2.tryWithPath = function(e3, t3, r3 = {}) {
          try {
            return e3();
          } catch (e4) {
            throw void 0 !== e4.path ? e4.path = t3 + "." + e4.path : e4.path = t3, r3.append && (e4.message = `${e4.message} (${e4.path})`), e4;
          }
        }, t2.validateArg = function(e3, r3, { assert: s2, message: n2 }) {
          if (t2.isSchema(s2)) {
            const t3 = s2.validate(e3);
            if (!t3.error) return;
            return t3.error.message;
          }
          if (!s2(e3)) return r3 ? `${r3} ${n2}` : n2;
        }, t2.verifyFlat = function(e3, t3) {
          for (const r3 of e3) s(!Array.isArray(r3), "Method no longer accepts array arguments:", t3);
        };
      }, 3541(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(9415), a = r2(8529), i = {};
        t2.schema = function(e3, t3, r3 = {}) {
          n.assertOptions(r3, ["appendPath", "override"]);
          try {
            return i.schema(e3, t3, r3);
          } catch (e4) {
            throw r3.appendPath && void 0 !== e4.path && (e4.message = `${e4.message} (${e4.path})`), e4;
          }
        }, i.schema = function(e3, t3, r3) {
          s(void 0 !== t3, "Invalid undefined schema"), Array.isArray(t3) && (s(t3.length, "Invalid empty array schema"), 1 === t3.length && (t3 = t3[0]));
          const a2 = (t4, ...s2) => false !== r3.override ? t4.valid(e3.override, ...s2) : t4.valid(...s2);
          if (i.simple(t3)) return a2(e3, t3);
          if ("function" == typeof t3) return e3.custom(t3);
          if (s("object" == typeof t3, "Invalid schema content:", typeof t3), n.isResolvable(t3)) return a2(e3, t3);
          if (n.isSchema(t3)) return t3;
          if (Array.isArray(t3)) {
            for (const r4 of t3) if (!i.simple(r4)) return e3.alternatives().try(...t3);
            return a2(e3, ...t3);
          }
          return t3 instanceof RegExp ? e3.string().regex(t3) : t3 instanceof Date ? a2(e3.date(), t3) : (s(Object.getPrototypeOf(t3) === Object.getPrototypeOf({}), "Schema can only contain plain objects"), e3.object().keys(t3));
        }, t2.ref = function(e3, t3) {
          return a.isRef(e3) ? e3 : a.create(e3, t3);
        }, t2.compile = function(e3, r3, a2 = {}) {
          n.assertOptions(a2, ["legacy"]);
          const o = r3 && r3[n.symbols.any];
          if (o) return s(a2.legacy || o.version === n.version, "Cannot mix different versions of joi schemas:", o.version, n.version), r3;
          if ("object" != typeof r3 || !a2.legacy) return t2.schema(e3, r3, { appendPath: true });
          const l = i.walk(r3);
          return l ? l.compile(l.root, r3) : t2.schema(e3, r3, { appendPath: true });
        }, i.walk = function(e3) {
          if ("object" != typeof e3) return null;
          if (Array.isArray(e3)) {
            for (const t4 of e3) {
              const e4 = i.walk(t4);
              if (e4) return e4;
            }
            return null;
          }
          const t3 = e3[n.symbols.any];
          if (t3) return { root: e3[t3.root], compile: t3.compile };
          s(Object.getPrototypeOf(e3) === Object.getPrototypeOf({}), "Schema can only contain plain objects");
          for (const t4 in e3) {
            const r3 = i.walk(e3[t4]);
            if (r3) return r3;
          }
          return null;
        }, i.simple = function(e3) {
          return null === e3 || ["boolean", "string", "number"].includes(typeof e3);
        }, t2.when = function(e3, r3, o) {
          if (void 0 === o && (s(r3 && "object" == typeof r3, "Missing options"), o = r3, r3 = a.create(".")), Array.isArray(o) && (o = { switch: o }), n.assertOptions(o, ["is", "not", "then", "otherwise", "switch", "break"]), n.isSchema(r3)) return s(void 0 === o.is, '"is" can not be used with a schema condition'), s(void 0 === o.not, '"not" can not be used with a schema condition'), s(void 0 === o.switch, '"switch" can not be used with a schema condition'), i.condition(e3, { is: r3, then: o.then, otherwise: o.otherwise, break: o.break });
          if (s(a.isRef(r3) || "string" == typeof r3, "Invalid condition:", r3), s(void 0 === o.not || void 0 === o.is, 'Cannot combine "is" with "not"'), void 0 === o.switch) {
            let l2 = o;
            void 0 !== o.not && (l2 = { is: o.not, then: o.otherwise, otherwise: o.then, break: o.break });
            let c = void 0 !== l2.is ? e3.$_compile(l2.is) : e3.$_root.invalid(null, false, 0, "").required();
            return s(void 0 !== l2.then || void 0 !== l2.otherwise, 'options must have at least one of "then", "otherwise", or "switch"'), s(void 0 === l2.break || void 0 === l2.then || void 0 === l2.otherwise, "Cannot specify then, otherwise, and break all together"), void 0 === o.is || a.isRef(o.is) || n.isSchema(o.is) || (c = c.required()), i.condition(e3, { ref: t2.ref(r3), is: c, then: l2.then, otherwise: l2.otherwise, break: l2.break });
          }
          s(Array.isArray(o.switch), '"switch" must be an array'), s(void 0 === o.is, 'Cannot combine "switch" with "is"'), s(void 0 === o.not, 'Cannot combine "switch" with "not"'), s(void 0 === o.then, 'Cannot combine "switch" with "then"');
          const l = { ref: t2.ref(r3), switch: [], break: o.break };
          for (let t3 = 0; t3 < o.switch.length; ++t3) {
            const r4 = o.switch[t3], i2 = t3 === o.switch.length - 1;
            n.assertOptions(r4, i2 ? ["is", "then", "otherwise"] : ["is", "then"]), s(void 0 !== r4.is, 'Switch statement missing "is"'), s(void 0 !== r4.then, 'Switch statement missing "then"');
            const c = { is: e3.$_compile(r4.is), then: e3.$_compile(r4.then) };
            if (a.isRef(r4.is) || n.isSchema(r4.is) || (c.is = c.is.required()), i2) {
              s(void 0 === o.otherwise || void 0 === r4.otherwise, 'Cannot specify "otherwise" inside and outside a "switch"');
              const t4 = void 0 !== o.otherwise ? o.otherwise : r4.otherwise;
              void 0 !== t4 && (s(void 0 === l.break, "Cannot specify both otherwise and break"), c.otherwise = e3.$_compile(t4));
            }
            l.switch.push(c);
          }
          return l;
        }, i.condition = function(e3, t3) {
          for (const r3 of ["then", "otherwise"]) void 0 === t3[r3] ? delete t3[r3] : t3[r3] = e3.$_compile(t3[r3]);
          return t3;
        };
      }, 8013(e2, t2, r2) {
        "use strict";
        const s = r2(554), n = r2(9415), a = r2(1532);
        t2.Report = class {
          constructor(e3, r3, s2, n2, a2, i, o) {
            if (this.code = e3, this.flags = n2, this.messages = a2, this.path = i.path, this.prefs = o, this.state = i, this.value = r3, this.message = null, this.template = null, this.local = s2 || {}, this.local.label = t2.label(this.flags, this.state, this.prefs, this.messages), void 0 === this.value || this.local.hasOwnProperty("value") || (this.local.value = this.value), this.path.length) {
              const e4 = this.path[this.path.length - 1];
              "object" != typeof e4 && (this.local.key = e4);
            }
          }
          _setTemplate(e3) {
            if (this.template = e3, !this.flags.label && 0 === this.path.length) {
              const e4 = this._template(this.template, "root");
              e4 && (this.local.label = e4);
            }
          }
          toString() {
            if (this.message) return this.message;
            const e3 = this.code;
            if (!this.prefs.errors.render) return this.code;
            const t3 = this._template(this.template) || this._template(this.prefs.messages) || this._template(this.messages);
            return void 0 === t3 ? `Error code "${e3}" is not defined, your custom type is missing the correct messages definition` : (this.message = t3.render(this.value, this.state, this.prefs, this.local, { errors: this.prefs.errors, messages: [this.prefs.messages, this.messages] }), this.prefs.errors.label || (this.message = this.message.replace(/^"" /, "").trim()), this.message);
          }
          _template(e3, r3) {
            return t2.template(this.value, e3, r3 || this.code, this.state, this.prefs);
          }
        }, t2.path = function(e3) {
          let t3 = "";
          for (const r3 of e3) "object" != typeof r3 && ("string" == typeof r3 ? (t3 && (t3 += "."), t3 += r3) : t3 += `[${r3}]`);
          return t3;
        }, t2.template = function(e3, t3, r3, s2, i) {
          if (!t3) return;
          if (a.isTemplate(t3)) return "root" !== r3 ? t3 : null;
          let o = i.errors.language;
          if (n.isResolvable(o) && (o = o.resolve(e3, s2, i)), o && t3[o]) {
            if (void 0 !== t3[o][r3]) return t3[o][r3];
            if (void 0 !== t3[o]["*"]) return t3[o]["*"];
          }
          return t3[r3] ? t3[r3] : t3["*"];
        }, t2.label = function(e3, r3, s2, n2) {
          if (!s2.errors.label) return "";
          if (e3.label) return e3.label;
          let a2 = r3.path;
          "key" === s2.errors.label && r3.path.length > 1 && (a2 = r3.path.slice(-1));
          return t2.path(a2) || t2.template(null, s2.messages, "root", r3, s2) || n2 && t2.template(null, n2, "root", r3, s2) || "value";
        }, t2.process = function(e3, r3, s2) {
          if (!e3) return null;
          const { override: n2, message: a2, details: i } = t2.details(e3);
          if (n2) return n2;
          if (s2.errors.stack) return new t2.ValidationError(a2, i, r3);
          const o = Error.stackTraceLimit;
          Error.stackTraceLimit = 0;
          const l = new t2.ValidationError(a2, i, r3);
          return Error.stackTraceLimit = o, l;
        }, t2.details = function(e3, t3 = {}) {
          let r3 = [];
          const s2 = [];
          for (const n2 of e3) {
            if (n2 instanceof Error) {
              if (false !== t3.override) return { override: n2 };
              const e5 = n2.toString();
              r3.push(e5), s2.push({ message: e5, type: "override", context: { error: n2 } });
              continue;
            }
            const e4 = n2.toString();
            r3.push(e4), s2.push({ message: e4, path: n2.path.filter((e5) => "object" != typeof e5), type: n2.code, context: n2.local });
          }
          return r3.length > 1 && (r3 = [...new Set(r3)]), { message: r3.join(". "), details: s2 };
        }, t2.ValidationError = class extends Error {
          constructor(e3, t3, r3) {
            super(e3), this._original = r3, this.details = t3;
          }
          static isError(e3) {
            return e3 instanceof t2.ValidationError;
          }
        }, t2.ValidationError.prototype.isJoi = true, t2.ValidationError.prototype.name = "ValidationError", t2.ValidationError.prototype.annotate = s.error;
      }, 2062(e2, t2, r2) {
        "use strict";
        const { assert: s, clone: n } = r2(3115), a = r2(9415), i = r2(6162), o = {};
        t2.type = function(e3, t3) {
          const r3 = Object.getPrototypeOf(e3), l = n(r3), c = e3._assign(Object.create(l)), u = Object.assign({}, t3);
          delete u.base, l._definition = u;
          const f = r3._definition || {};
          u.messages = i.merge(f.messages, u.messages), u.properties = Object.assign({}, f.properties, u.properties), c.type = u.type, u.flags = Object.assign({}, f.flags, u.flags);
          const m = Object.assign({}, f.terms);
          if (u.terms) for (const e4 in u.terms) {
            const t4 = u.terms[e4];
            s(void 0 === c.$_terms[e4], "Invalid term override for", u.type, e4), c.$_terms[e4] = t4.init, m[e4] = t4;
          }
          u.terms = m, u.args || (u.args = f.args), u.prepare = o.prepare(u.prepare, f.prepare), u.coerce && ("function" == typeof u.coerce && (u.coerce = { method: u.coerce }), u.coerce.from && !Array.isArray(u.coerce.from) && (u.coerce = { method: u.coerce.method, from: [].concat(u.coerce.from) })), u.coerce = o.coerce(u.coerce, f.coerce), u.validate = o.validate(u.validate, f.validate);
          const h = Object.assign({}, f.rules);
          if (u.rules) for (const e4 in u.rules) {
            const t4 = u.rules[e4];
            s("object" == typeof t4, "Invalid rule definition for", u.type, e4);
            let r4 = t4.method;
            if (void 0 === r4 && (r4 = function() {
              return this.$_addRule(e4);
            }), r4 && (s(!l[e4], "Rule conflict in", u.type, e4), l[e4] = r4), s(!h[e4], "Rule conflict in", u.type, e4), h[e4] = t4, t4.alias) {
              const e5 = [].concat(t4.alias);
              for (const r5 of e5) l[r5] = t4.method;
            }
            t4.args && (t4.argsByName = /* @__PURE__ */ new Map(), t4.args = t4.args.map((e5) => ("string" == typeof e5 && (e5 = { name: e5 }), s(!t4.argsByName.has(e5.name), "Duplicated argument name", e5.name), a.isSchema(e5.assert) && (e5.assert = e5.assert.strict().label(e5.name)), t4.argsByName.set(e5.name, e5), e5)));
          }
          u.rules = h, u.jsonSchema || (u.jsonSchema = f.jsonSchema);
          const p = Object.assign({}, f.modifiers);
          if (u.modifiers) for (const e4 in u.modifiers) {
            s(!l[e4], "Rule conflict in", u.type, e4);
            const t4 = u.modifiers[e4];
            s("function" == typeof t4, "Invalid modifier definition for", u.type, e4);
            const r4 = function(t5) {
              return this.rule({ [e4]: t5 });
            };
            l[e4] = r4, p[e4] = t4;
          }
          if (u.modifiers = p, u.overrides) {
            l._super = r3, c.$_super = {};
            for (const e4 in u.overrides) s(r3[e4], "Cannot override missing", e4), u.overrides[e4][a.symbols.parent] = r3[e4], c.$_super[e4] = r3[e4].bind(c);
            Object.assign(l, u.overrides);
          }
          u.cast = Object.assign({}, f.cast, u.cast);
          const d = Object.assign({}, f.manifest, u.manifest);
          return d.build = o.build(u.manifest && u.manifest.build, f.manifest && f.manifest.build), u.manifest = d, u.rebuild = o.rebuild(u.rebuild, f.rebuild), c;
        }, o.build = function(e3, t3) {
          return e3 && t3 ? function(r3, s2) {
            return t3(e3(r3, s2), s2);
          } : e3 || t3;
        }, o.coerce = function(e3, t3) {
          return e3 && t3 ? { from: e3.from && t3.from ? [.../* @__PURE__ */ new Set([...e3.from, ...t3.from])] : null, method(r3, s2) {
            let n2;
            if ((!t3.from || t3.from.includes(typeof r3)) && (n2 = t3.method(r3, s2), n2)) {
              if (n2.errors || void 0 === n2.value) return n2;
              r3 = n2.value;
            }
            if (!e3.from || e3.from.includes(typeof r3)) {
              const t4 = e3.method(r3, s2);
              if (t4) return t4;
            }
            return n2;
          } } : e3 || t3;
        }, o.prepare = function(e3, t3) {
          return e3 && t3 ? function(r3, s2) {
            const n2 = e3(r3, s2);
            if (n2) {
              if (n2.errors || void 0 === n2.value) return n2;
              r3 = n2.value;
            }
            return t3(r3, s2) || n2;
          } : e3 || t3;
        }, o.rebuild = function(e3, t3) {
          return e3 && t3 ? function(r3) {
            t3(r3), e3(r3);
          } : e3 || t3;
        }, o.validate = function(e3, t3) {
          return e3 && t3 ? function(r3, s2) {
            const n2 = t3(r3, s2);
            if (n2) {
              if (n2.errors && (!Array.isArray(n2.errors) || n2.errors.length)) return n2;
              r3 = n2.value;
            }
            return e3(r3, s2) || n2;
          } : e3 || t3;
        };
      }, 1100(e2, t2, r2) {
        "use strict";
        const { assert: s, clone: n } = r2(3115), a = r2(2130), i = r2(9415), o = r2(3541), l = r2(8013), c = r2(2062), u = r2(9017), f = r2(8529), m = r2(1532), h = r2(125);
        let p;
        const d = { types: { alternatives: r2(4972), any: r2(680), array: r2(2591), boolean: r2(6186), date: r2(2588), function: r2(4840), link: r2(9556), number: r2(4709), object: r2(7487), string: r2(9033), symbol: r2(5008) }, aliases: { alt: "alternatives", bool: "boolean", func: "function" }, root: function() {
          const e3 = { _types: new Set(Object.keys(d.types)) };
          for (const t3 of e3._types) e3[t3] = function(...e4) {
            return s(!e4.length || ["alternatives", "link", "object"].includes(t3), "The", t3, "type does not allow arguments"), d.generate(this, d.types[t3], e4);
          };
          for (const t3 of ["allow", "custom", "disallow", "equal", "exist", "forbidden", "invalid", "not", "only", "optional", "options", "prefs", "preferences", "required", "strip", "valid", "when"]) e3[t3] = function(...e4) {
            return this.any()[t3](...e4);
          };
          Object.assign(e3, d.methods);
          for (const t3 in d.aliases) {
            const r3 = d.aliases[t3];
            e3[t3] = e3[r3];
          }
          return e3.x = e3.expression, h.setup && h.setup(e3), e3;
        } };
        d.methods = { ValidationError: l.ValidationError, version: i.version, cache: a.provider, assert(e3, t3, ...r3) {
          d.assert(e3, t3, true, r3);
        }, attempt: (e3, t3, ...r3) => d.assert(e3, t3, false, r3), build(e3) {
          return s("function" == typeof u.build, "Manifest functionality disabled"), u.build(this, e3);
        }, checkPreferences(e3) {
          i.checkPreferences(e3);
        }, compile(e3, t3) {
          return o.compile(this, e3, t3);
        }, defaults(e3) {
          s("function" == typeof e3, "modifier must be a function");
          const t3 = Object.assign({}, this);
          for (const r3 of t3._types) {
            const n2 = e3(t3[r3]());
            s(i.isSchema(n2), "modifier must return a valid schema object"), t3[r3] = function(...e4) {
              return d.generate(this, n2, e4);
            };
          }
          return t3;
        }, expression: (...e3) => new m(...e3), extend(...e3) {
          i.verifyFlat(e3, "extend"), p = p || r2(1688), s(e3.length, "You need to provide at least one extension"), this.assert(e3, p.extensions);
          const t3 = Object.assign({}, this);
          t3._types = new Set(t3._types);
          for (let r3 of e3) {
            "function" == typeof r3 && (r3 = r3(t3)), this.assert(r3, p.extension);
            const e4 = d.expandExtension(r3, t3);
            for (const r4 of e4) {
              s(void 0 === t3[r4.type] || t3._types.has(r4.type), "Cannot override name", r4.type);
              const e5 = r4.base || this.any(), n2 = c.type(e5, r4);
              t3._types.add(r4.type), t3[r4.type] = function(...e6) {
                return d.generate(this, n2, e6);
              };
            }
          }
          return t3;
        }, isError: l.ValidationError.isError, isExpression: m.isTemplate, isRef: f.isRef, isSchema: i.isSchema, in: (...e3) => f.in(...e3), override: i.symbols.override, ref: (...e3) => f.create(...e3), types() {
          const e3 = {};
          for (const t3 of this._types) e3[t3] = this[t3]();
          for (const t3 in d.aliases) e3[t3] = this[t3]();
          return e3;
        } }, d.assert = function(e3, t3, r3, s2) {
          const a2 = s2[0] instanceof Error || "string" == typeof s2[0] ? s2[0] : null, o2 = null !== a2 ? s2[1] : s2[0], c2 = t3.validate(e3, i.preferences({ errors: { stack: true } }, o2 || {}));
          let u2 = c2.error;
          if (!u2) return c2.value;
          if (a2 instanceof Error) throw a2;
          const f2 = r3 && "function" == typeof u2.annotate ? u2.annotate() : u2.message;
          throw u2 instanceof l.ValidationError == 0 && (u2 = n(u2)), u2.message = a2 ? `${a2} ${f2}` : f2, u2;
        }, d.generate = function(e3, t3, r3) {
          return s(e3, "Must be invoked on a Joi instance."), t3.$_root = e3, t3._definition.args && r3.length ? t3._definition.args(t3, ...r3) : t3;
        }, d.expandExtension = function(e3, t3) {
          if ("string" == typeof e3.type) return [e3];
          const r3 = [];
          for (const s2 of t3._types) if (e3.type.test(s2)) {
            const n2 = Object.assign({}, e3);
            n2.type = s2, n2.base = t3[s2](), r3.push(n2);
          }
          return r3;
        }, e2.exports = d.root();
      }, 6162(e2, t2, r2) {
        "use strict";
        const { assert: s, clone: n } = r2(3115), a = r2(1532);
        t2.compile = function(e3, t3) {
          if ("string" == typeof e3) return s(!t3, "Cannot set single message string"), new a(e3);
          if (a.isTemplate(e3)) return s(!t3, "Cannot set single message template"), e3;
          s("object" == typeof e3 && !Array.isArray(e3), "Invalid message options"), t3 = t3 ? n(t3) : {};
          for (let r3 in e3) {
            const n2 = e3[r3];
            if ("root" === r3 || a.isTemplate(n2)) {
              t3[r3] = n2;
              continue;
            }
            if ("string" == typeof n2) {
              t3[r3] = new a(n2);
              continue;
            }
            s("object" == typeof n2 && !Array.isArray(n2), "Invalid message for", r3);
            const i = r3;
            for (r3 in t3[i] = t3[i] || {}, n2) {
              const e4 = n2[r3];
              "root" === r3 || a.isTemplate(e4) ? t3[i][r3] = e4 : (s("string" == typeof e4, "Invalid message for", r3, "in", i), t3[i][r3] = new a(e4));
            }
          }
          return t3;
        }, t2.decompile = function(e3) {
          const t3 = {};
          for (let r3 in e3) {
            const s2 = e3[r3];
            if ("root" === r3) {
              t3.root = s2;
              continue;
            }
            if (a.isTemplate(s2)) {
              t3[r3] = s2.describe({ compact: true });
              continue;
            }
            const n2 = r3;
            for (r3 in t3[n2] = {}, s2) {
              const e4 = s2[r3];
              "root" !== r3 ? t3[n2][r3] = e4.describe({ compact: true }) : t3[n2].root = e4;
            }
          }
          return t3;
        }, t2.merge = function(e3, r3) {
          if (!e3) return t2.compile(r3);
          if (!r3) return e3;
          if ("string" == typeof r3) return new a(r3);
          if (a.isTemplate(r3)) return r3;
          const i = n(e3);
          for (let e4 in r3) {
            const t3 = r3[e4];
            if ("root" === e4 || a.isTemplate(t3)) {
              i[e4] = t3;
              continue;
            }
            if ("string" == typeof t3) {
              i[e4] = new a(t3);
              continue;
            }
            s("object" == typeof t3 && !Array.isArray(t3), "Invalid message for", e4);
            const n2 = e4;
            for (e4 in i[n2] = i[n2] || {}, t3) {
              const r4 = t3[e4];
              "root" === e4 || a.isTemplate(r4) ? i[n2][e4] = r4 : (s("string" == typeof r4, "Invalid message for", e4, "in", n2), i[n2][e4] = new a(r4));
            }
          }
          return i;
        };
      }, 5844(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(9415), a = r2(8529), i = {};
        t2.Ids = i.Ids = class {
          constructor() {
            this._byId = /* @__PURE__ */ new Map(), this._byKey = /* @__PURE__ */ new Map(), this._schemaChain = false;
          }
          clone() {
            const e3 = new i.Ids();
            return e3._byId = new Map(this._byId), e3._byKey = new Map(this._byKey), e3._schemaChain = this._schemaChain, e3;
          }
          concat(e3) {
            e3._schemaChain && (this._schemaChain = true);
            for (const [t3, r3] of e3._byId.entries()) s(!this._byKey.has(t3), "Schema id conflicts with existing key:", t3), this._byId.set(t3, r3);
            for (const [t3, r3] of e3._byKey.entries()) s(!this._byId.has(t3), "Schema key conflicts with existing id:", t3), this._byKey.set(t3, r3);
          }
          fork(e3, t3, r3) {
            const a2 = this._collect(e3);
            a2.push({ schema: r3 });
            const o = a2.shift();
            let l = { id: o.id, schema: t3(o.schema) };
            s(n.isSchema(l.schema), "adjuster function failed to return a joi schema type");
            for (const e4 of a2) l = { id: e4.id, schema: i.fork(e4.schema, l.id, l.schema) };
            return l.schema;
          }
          labels(e3, t3 = []) {
            const r3 = e3[0], s2 = this._get(r3);
            if (!s2) return [...t3, ...e3].join(".");
            const n2 = e3.slice(1);
            return t3 = [...t3, s2.schema._flags.label || r3], n2.length ? s2.schema._ids.labels(n2, t3) : t3.join(".");
          }
          reach(e3, t3 = []) {
            const r3 = e3[0], n2 = this._get(r3);
            s(n2, "Schema does not contain path", [...t3, ...e3].join("."));
            const a2 = e3.slice(1);
            return a2.length ? n2.schema._ids.reach(a2, [...t3, r3]) : n2.schema;
          }
          register(e3, { key: t3 } = {}) {
            if (!e3 || !n.isSchema(e3)) return;
            (e3.$_property("schemaChain") || e3._ids._schemaChain) && (this._schemaChain = true);
            const r3 = e3._flags.id;
            if (r3) {
              const t4 = this._byId.get(r3);
              s(!t4 || t4.schema === e3, "Cannot add different schemas with the same id:", r3), s(!this._byKey.has(r3), "Schema id conflicts with existing key:", r3), this._byId.set(r3, { schema: e3, id: r3 });
            }
            t3 && (s(!this._byKey.has(t3), "Schema already contains key:", t3), s(!this._byId.has(t3), "Schema key conflicts with existing id:", t3), this._byKey.set(t3, { schema: e3, id: t3 }));
          }
          reset() {
            this._byId = /* @__PURE__ */ new Map(), this._byKey = /* @__PURE__ */ new Map(), this._schemaChain = false;
          }
          _collect(e3, t3 = [], r3 = []) {
            const n2 = e3[0], a2 = this._get(n2);
            s(a2, "Schema does not contain path", [...t3, ...e3].join(".")), r3 = [a2, ...r3];
            const i2 = e3.slice(1);
            return i2.length ? a2.schema._ids._collect(i2, [...t3, n2], r3) : r3;
          }
          _get(e3) {
            return this._byId.get(e3) || this._byKey.get(e3);
          }
        }, i.fork = function(e3, r3, s2) {
          const n2 = t2.schema(e3, { each: (e4, { key: t3 }) => {
            if (r3 === (e4._flags.id || t3)) return s2;
          }, ref: false });
          return n2 ? n2.$_mutateRebuild() : e3;
        }, t2.schema = function(e3, t3) {
          let r3;
          for (const s2 in e3._flags) {
            if ("_" === s2[0]) continue;
            const n2 = i.scan(e3._flags[s2], { source: "flags", name: s2 }, t3);
            void 0 !== n2 && (r3 = r3 || e3.clone(), r3._flags[s2] = n2);
          }
          for (let s2 = 0; s2 < e3._rules.length; ++s2) {
            const n2 = e3._rules[s2], a2 = i.scan(n2.args, { source: "rules", name: n2.name }, t3);
            if (void 0 !== a2) {
              r3 = r3 || e3.clone();
              const t4 = Object.assign({}, n2);
              t4.args = a2, r3._rules[s2] = t4, r3._singleRules.get(n2.name) === n2 && r3._singleRules.set(n2.name, t4);
            }
          }
          for (const s2 in e3.$_terms) {
            if ("_" === s2[0]) continue;
            const n2 = i.scan(e3.$_terms[s2], { source: "terms", name: s2 }, t3);
            void 0 !== n2 && (r3 = r3 || e3.clone(), r3.$_terms[s2] = n2);
          }
          return r3;
        }, i.scan = function(e3, t3, r3, s2, o) {
          const l = s2 || [];
          if (null === e3 || "object" != typeof e3) return;
          let c;
          if (Array.isArray(e3)) {
            for (let s3 = 0; s3 < e3.length; ++s3) {
              const n2 = "terms" === t3.source && "keys" === t3.name && e3[s3].key, a2 = i.scan(e3[s3], t3, r3, [s3, ...l], n2);
              void 0 !== a2 && (c = c || e3.slice(), c[s3] = a2);
            }
            return c;
          }
          if (false !== r3.schema && n.isSchema(e3) || false !== r3.ref && a.isRef(e3)) {
            const s3 = r3.each(e3, { ...t3, path: l, key: o });
            if (s3 === e3) return;
            return s3;
          }
          for (const s3 in e3) {
            if ("_" === s3[0]) continue;
            const n2 = i.scan(e3[s3], t3, r3, [s3, ...l], o);
            void 0 !== n2 && (c = c || Object.assign({}, e3), c[s3] = n2);
          }
          return c;
        };
      }, 8529(e2, t2, r2) {
        "use strict";
        const { assert: s, clone: n, reach: a } = r2(3115), i = r2(9415);
        let o;
        const l = { symbol: /* @__PURE__ */ Symbol("ref"), defaults: { adjust: null, in: false, iterables: null, map: null, separator: ".", type: "value" } };
        t2.create = function(e3, t3 = {}) {
          s("string" == typeof e3, "Invalid reference key:", e3), i.assertOptions(t3, ["adjust", "ancestor", "in", "iterables", "map", "prefix", "render", "separator"]), s(!t3.prefix || "object" == typeof t3.prefix, "options.prefix must be of type object");
          const r3 = Object.assign({}, l.defaults, t3);
          delete r3.prefix;
          const n2 = r3.separator, a2 = l.context(e3, n2, t3.prefix);
          if (r3.type = a2.type, e3 = a2.key, "value" === r3.type) if (a2.root && (s(!n2 || e3[0] !== n2, "Cannot specify relative path with root prefix"), r3.ancestor = "root", e3 || (e3 = null)), n2 && n2 === e3) e3 = null, r3.ancestor = 0;
          else if (void 0 !== r3.ancestor) s(!n2 || !e3 || e3[0] !== n2, "Cannot combine prefix with ancestor option");
          else {
            const [t4, s2] = l.ancestor(e3, n2);
            s2 && "" === (e3 = e3.slice(s2)) && (e3 = null), r3.ancestor = t4;
          }
          return r3.path = n2 ? null === e3 ? [] : e3.split(n2) : [e3], new l.Ref(r3);
        }, t2.in = function(e3, r3 = {}) {
          return t2.create(e3, { ...r3, in: true });
        }, t2.isRef = function(e3) {
          return !!e3 && !!e3[i.symbols.ref];
        }, l.Ref = class {
          constructor(e3) {
            s("object" == typeof e3, "Invalid reference construction"), i.assertOptions(e3, ["adjust", "ancestor", "in", "iterables", "map", "path", "render", "separator", "type", "depth", "key", "root", "display"]), s([false, void 0].includes(e3.separator) || "string" == typeof e3.separator && 1 === e3.separator.length, "Invalid separator"), s(!e3.adjust || "function" == typeof e3.adjust, "options.adjust must be a function"), s(!e3.map || Array.isArray(e3.map), "options.map must be an array"), s(!e3.map || !e3.adjust, "Cannot set both map and adjust options"), Object.assign(this, l.defaults, e3), s("value" === this.type || void 0 === this.ancestor, "Non-value references cannot reference ancestors"), Array.isArray(this.map) && (this.map = new Map(this.map)), this.depth = this.path.length, this.key = this.path.length ? this.path.join(this.separator) : null, this.root = this.path[0], this.updateDisplay();
          }
          resolve(e3, t3, r3, n2, a2 = {}) {
            return s(!this.in || a2.in, "Invalid in() reference usage"), "global" === this.type ? this._resolve(r3.context, t3, a2) : "local" === this.type ? this._resolve(n2, t3, a2) : this.ancestor ? "root" === this.ancestor ? this._resolve(t3.ancestors[t3.ancestors.length - 1], t3, a2) : (s(this.ancestor <= t3.ancestors.length, "Invalid reference exceeds the schema root:", this.display), this._resolve(t3.ancestors[this.ancestor - 1], t3, a2)) : this._resolve(e3, t3, a2);
          }
          _resolve(e3, t3, r3) {
            let s2;
            if ("value" === this.type && t3.mainstay.shadow && false !== r3.shadow && (s2 = t3.mainstay.shadow.get(this.absolute(t3))), void 0 === s2 && (s2 = a(e3, this.path, { iterables: this.iterables, functions: true })), this.adjust && (s2 = this.adjust(s2)), this.map) {
              const e4 = this.map.get(s2);
              void 0 !== e4 && (s2 = e4);
            }
            return t3.mainstay && t3.mainstay.tracer.resolve(t3, this, s2), s2;
          }
          toString() {
            return this.display;
          }
          absolute(e3) {
            return [...e3.path.slice(0, -this.ancestor), ...this.path];
          }
          clone() {
            return new l.Ref(this);
          }
          describe() {
            const e3 = { path: this.path };
            "value" !== this.type && (e3.type = this.type), "." !== this.separator && (e3.separator = this.separator), "value" === this.type && 1 !== this.ancestor && (e3.ancestor = this.ancestor), this.map && (e3.map = [...this.map]);
            for (const t3 of ["adjust", "iterables", "render"]) null !== this[t3] && void 0 !== this[t3] && (e3[t3] = this[t3]);
            return false !== this.in && (e3.in = true), { ref: e3 };
          }
          updateDisplay() {
            const e3 = null !== this.key ? this.key : "";
            if ("value" !== this.type) return void (this.display = `ref:${this.type}:${e3}`);
            if (!this.separator) return void (this.display = `ref:${e3}`);
            if (!this.ancestor) return void (this.display = `ref:${this.separator}${e3}`);
            if ("root" === this.ancestor) return void (this.display = `ref:root:${e3}`);
            if (1 === this.ancestor) return void (this.display = `ref:${e3 || ".."}`);
            const t3 = new Array(this.ancestor + 1).fill(this.separator).join("");
            this.display = `ref:${t3}${e3 || ""}`;
          }
        }, l.Ref.prototype[i.symbols.ref] = true, t2.build = function(e3) {
          return "value" === (e3 = Object.assign({}, l.defaults, e3)).type && void 0 === e3.ancestor && (e3.ancestor = 1), new l.Ref(e3);
        }, l.context = function(e3, t3, r3 = {}) {
          if (e3 = e3.trim(), r3) {
            const s2 = void 0 === r3.global ? "$" : r3.global;
            if (s2 !== t3 && e3.startsWith(s2)) return { key: e3.slice(s2.length), type: "global" };
            const n2 = void 0 === r3.local ? "#" : r3.local;
            if (n2 !== t3 && e3.startsWith(n2)) return { key: e3.slice(n2.length), type: "local" };
            const a2 = void 0 === r3.root ? "/" : r3.root;
            if (a2 !== t3 && e3.startsWith(a2)) return { key: e3.slice(a2.length), type: "value", root: true };
          }
          return { key: e3, type: "value" };
        }, l.ancestor = function(e3, t3) {
          if (!t3) return [1, 0];
          if (e3[0] !== t3) return [1, 0];
          if (e3[1] !== t3) return [0, 1];
          let r3 = 2;
          for (; e3[r3] === t3; ) ++r3;
          return [r3 - 1, r3];
        }, t2.toSibling = 0, t2.toParent = 1, t2.Manager = class {
          constructor() {
            this.refs = [];
          }
          register(e3, s2) {
            if (e3) if (s2 = void 0 === s2 ? t2.toParent : s2, Array.isArray(e3)) for (const t3 of e3) this.register(t3, s2);
            else if (i.isSchema(e3)) for (const t3 of e3._refs.refs) t3.ancestor - s2 >= 0 && this.refs.push({ ancestor: t3.ancestor - s2, root: t3.root });
            else t2.isRef(e3) && "value" === e3.type && e3.ancestor - s2 >= 0 && this.refs.push({ ancestor: e3.ancestor - s2, root: e3.root }), o = o || r2(1532), o.isTemplate(e3) && this.register(e3.refs(), s2);
          }
          get length() {
            return this.refs.length;
          }
          clone() {
            const e3 = new t2.Manager();
            return e3.refs = n(this.refs), e3;
          }
          reset() {
            this.refs = [];
          }
          roots() {
            return this.refs.filter((e3) => !e3.ancestor).map((e3) => e3.root);
          }
        };
      }, 1688(e2, t2, r2) {
        "use strict";
        const s = r2(1100), n = {};
        n.wrap = s.string().min(1).max(2).allow(false), t2.preferences = s.object({ allowUnknown: s.boolean(), abortEarly: s.boolean(), artifacts: s.boolean(), cache: s.boolean(), context: s.object(), convert: s.boolean(), dateFormat: s.valid("date", "iso", "string", "time", "utc"), debug: s.boolean(), errors: { escapeHtml: s.boolean(), label: s.valid("path", "key", false), language: [s.string(), s.object().ref()], render: s.boolean(), stack: s.boolean(), wrap: { label: n.wrap, array: n.wrap, string: n.wrap } }, externals: s.boolean(), messages: s.object(), noDefaults: s.boolean(), nonEnumerables: s.boolean(), presence: s.valid("required", "optional", "forbidden"), skipFunctions: s.boolean(), stripUnknown: s.object({ arrays: s.boolean(), objects: s.boolean() }).or("arrays", "objects").allow(true, false), warnings: s.boolean() }).strict(), n.nameRx = /^[a-zA-Z0-9]\w*$/, n.rule = s.object({ alias: s.array().items(s.string().pattern(n.nameRx)).single(), args: s.array().items(s.string(), s.object({ name: s.string().pattern(n.nameRx).required(), ref: s.boolean(), assert: s.alternatives([s.function(), s.object().schema()]).conditional("ref", { is: true, then: s.required() }), normalize: s.function(), message: s.string().when("assert", { is: s.function(), then: s.required() }) })), convert: s.boolean(), manifest: s.boolean(), method: s.function().allow(false), multi: s.boolean(), validate: s.function(), jsonSchema: s.function() }), t2.extension = s.object({ type: s.alternatives([s.string(), s.object().regex()]).required(), args: s.function(), cast: s.object().pattern(n.nameRx, s.object({ from: s.function().maxArity(1).required(), to: s.function().minArity(1).maxArity(2).required() })), base: s.object().schema().when("type", { is: s.object().regex(), then: s.forbidden() }), coerce: [s.function().maxArity(3), s.object({ method: s.function().maxArity(3).required(), from: s.array().items(s.string()).single() })], flags: s.object().pattern(n.nameRx, s.object({ setter: s.string(), default: s.any() })), manifest: { build: s.function().arity(2) }, messages: [s.object(), s.string()], modifiers: s.object().pattern(n.nameRx, s.function().minArity(1).maxArity(2)), overrides: s.object().pattern(n.nameRx, s.function()), prepare: s.function().maxArity(3), rebuild: s.function().arity(1), rules: s.object().pattern(n.nameRx, n.rule), jsonSchema: s.function(), terms: s.object().pattern(n.nameRx, s.object({ init: s.array().allow(null).required(), manifest: s.object().pattern(/.+/, [s.valid("schema", "single"), s.object({ mapped: s.object({ from: s.string().required(), to: s.string().required() }).required() })]) })), validate: s.function().maxArity(3) }).strict(), t2.extensions = s.array().items(s.object(), s.function().arity(1)).strict(), n.desc = { buffer: s.object({ buffer: s.string() }), func: s.object({ function: s.function().required(), options: { literal: true } }), override: s.object({ override: true }), ref: s.object({ ref: s.object({ type: s.valid("value", "global", "local"), path: s.array().required(), separator: s.string().length(1).allow(false), ancestor: s.number().min(0).integer().allow("root"), map: s.array().items(s.array().length(2)).min(1), adjust: s.function(), iterables: s.boolean(), in: s.boolean(), render: s.boolean() }).required() }), regex: s.object({ regex: s.string().min(3) }), special: s.object({ special: s.valid("deep").required() }), template: s.object({ template: s.string().required(), options: s.object() }), value: s.object({ value: s.alternatives([s.object(), s.array()]).required() }) }, n.desc.entity = s.alternatives([s.array().items(s.link("...")), s.boolean(), s.function(), s.number(), s.string(), n.desc.buffer, n.desc.func, n.desc.ref, n.desc.regex, n.desc.special, n.desc.template, n.desc.value, s.link("/")]), n.desc.values = s.array().items(null, s.boolean(), s.function(), s.number().allow(1 / 0, -1 / 0, NaN), s.string().allow(""), s.symbol(), n.desc.buffer, n.desc.func, n.desc.override, n.desc.ref, n.desc.regex, n.desc.template, n.desc.value), n.desc.messages = s.object().pattern(/.+/, [s.string(), n.desc.template, s.object().pattern(/.+/, [s.string(), n.desc.template])]), t2.description = s.object({ type: s.string().required(), flags: s.object({ cast: s.string(), default: s.any(), description: s.string(), empty: s.link("/"), failover: n.desc.entity, id: s.string(), label: s.string(), only: true, presence: ["optional", "required", "forbidden"], result: ["raw", "strip"], strip: s.boolean(), unit: s.string() }).unknown(), preferences: { allowUnknown: s.boolean(), abortEarly: s.boolean(), artifacts: s.boolean(), cache: s.boolean(), convert: s.boolean(), dateFormat: ["date", "iso", "string", "time", "utc"], errors: { escapeHtml: s.boolean(), label: ["path", "key"], language: [s.string(), n.desc.ref], wrap: { label: n.wrap, array: n.wrap } }, externals: s.boolean(), messages: n.desc.messages, noDefaults: s.boolean(), nonEnumerables: s.boolean(), presence: ["required", "optional", "forbidden"], skipFunctions: s.boolean(), stripUnknown: s.object({ arrays: s.boolean(), objects: s.boolean() }).or("arrays", "objects").allow(true, false), warnings: s.boolean() }, allow: n.desc.values, invalid: n.desc.values, rules: s.array().min(1).items({ name: s.string().required(), args: s.object().min(1), keep: s.boolean(), message: [s.string(), n.desc.messages], warn: s.boolean() }), keys: s.object().pattern(/.*/, s.link("/")), link: n.desc.ref }).pattern(/^[a-z]\w*$/, s.any());
      }, 4957(e2, t2, r2) {
        "use strict";
        const { clone: s, reach: n } = r2(3115), a = r2(9415), i = { value: /* @__PURE__ */ Symbol("value") };
        e2.exports = i.State = class {
          constructor(e3, t3, r3) {
            this.path = e3, this.ancestors = t3, this.mainstay = r3.mainstay, this.schemas = r3.schemas, this.debug = null;
          }
          localize(e3, t3 = null, r3 = null) {
            const s2 = new i.State(e3, t3, this);
            return r3 && s2.schemas && (s2.schemas = [i.schemas(r3), ...s2.schemas]), s2;
          }
          nest(e3, t3) {
            const r3 = new i.State(this.path, this.ancestors, this);
            return r3.schemas = r3.schemas && [i.schemas(e3), ...r3.schemas], r3.debug = t3, r3;
          }
          shadow(e3, t3) {
            this.mainstay.shadow = this.mainstay.shadow || new i.Shadow(), this.mainstay.shadow.set(this.path, e3, t3);
          }
          snapshot() {
            this.mainstay.shadow && (this._snapshot = s(this.mainstay.shadow.node(this.path))), this.mainstay.snapshot();
          }
          restore() {
            this.mainstay.shadow && (this.mainstay.shadow.override(this.path, this._snapshot), this._snapshot = void 0), this.mainstay.restore();
          }
          commit() {
            this.mainstay.shadow && (this.mainstay.shadow.override(this.path, this._snapshot), this._snapshot = void 0), this.mainstay.commit();
          }
        }, i.schemas = function(e3) {
          return a.isSchema(e3) ? { schema: e3 } : e3;
        }, i.Shadow = class {
          constructor() {
            this._values = null;
          }
          set(e3, t3, r3) {
            if (!e3.length) return;
            if ("strip" === r3 && "number" == typeof e3[e3.length - 1]) return;
            this._values = this._values || /* @__PURE__ */ new Map();
            let s2 = this._values;
            for (let t4 = 0; t4 < e3.length; ++t4) {
              const r4 = e3[t4];
              let n2 = s2.get(r4);
              n2 || (n2 = /* @__PURE__ */ new Map(), s2.set(r4, n2)), s2 = n2;
            }
            s2[i.value] = t3;
          }
          get(e3) {
            const t3 = this.node(e3);
            if (t3) return t3[i.value];
          }
          node(e3) {
            if (this._values) return n(this._values, e3, { iterables: true });
          }
          override(e3, t3) {
            if (!this._values) return;
            const r3 = e3.slice(0, -1), s2 = e3[e3.length - 1], a2 = n(this._values, r3, { iterables: true });
            t3 ? a2.set(s2, t3) : a2 && a2.delete(s2);
          }
        };
      }, 1532(e2, t2, r2) {
        "use strict";
        const { assert: s, clone: n, escapeHtml: a } = r2(3115), i = r2(679), o = r2(9415), l = r2(8013), c = r2(8529), u = { symbol: /* @__PURE__ */ Symbol("template"), opens: new Array(1e3).join("\0"), closes: new Array(1e3).join(""), dateFormat: { date: Date.prototype.toDateString, iso: Date.prototype.toISOString, string: Date.prototype.toString, time: Date.prototype.toTimeString, utc: Date.prototype.toUTCString } };
        e2.exports = u.Template = class {
          constructor(e3, t3) {
            if (s("string" == typeof e3, "Template source must be a string"), s(!e3.includes("\0") && !e3.includes(""), "Template source cannot contain reserved control characters"), this.source = e3, this.rendered = e3, this._template = null, t3) {
              const { functions: e4, ...r3 } = t3;
              this._settings = Object.keys(r3).length ? n(r3) : void 0, this._functions = e4, this._functions && (s(Object.keys(this._functions).every((e5) => "string" == typeof e5), "Functions keys must be strings"), s(Object.values(this._functions).every((e5) => "function" == typeof e5), "Functions values must be functions"));
            } else this._settings = void 0, this._functions = void 0;
            this._parse();
          }
          _parse() {
            if (!this.source.includes("{")) return;
            const e3 = u.encode(this.source), t3 = u.split(e3);
            let r3 = false;
            const s2 = [], n2 = t3.shift();
            n2 && s2.push(u.decode(n2));
            for (const e4 of t3) {
              const t4 = "{" !== e4[0], n3 = t4 ? "}" : "}}", a2 = e4.indexOf(n3);
              if (-1 === a2 || "{" === e4[1]) {
                s2.push(`{${u.decode(e4)}`);
                continue;
              }
              let i2 = e4.slice(t4 ? 0 : 1, a2);
              const o2 = ":" === i2[0];
              o2 && (i2 = i2.slice(1));
              const l2 = this._ref(u.decode(i2), { raw: t4, wrapped: o2 });
              s2.push(l2), "string" != typeof l2 && (r3 = true);
              const c2 = e4.slice(a2 + n3.length);
              c2 && s2.push(u.decode(c2));
            }
            r3 ? this._template = s2 : this.rendered = s2.join("");
          }
          static date(e3, t3) {
            return u.dateFormat[t3.dateFormat].call(e3);
          }
          describe(e3 = {}) {
            if (!this._settings && e3.compact) return this.source;
            const t3 = { template: this.source };
            return this._settings && (t3.options = this._settings), this._functions && (t3.functions = this._functions), t3;
          }
          static build(e3) {
            return new u.Template(e3.template, e3.options || e3.functions ? { ...e3.options, functions: e3.functions } : void 0);
          }
          isDynamic() {
            return !!this._template;
          }
          static isTemplate(e3) {
            return !!e3 && !!e3[o.symbols.template];
          }
          refs() {
            if (!this._template) return;
            const e3 = [];
            for (const t3 of this._template) "string" != typeof t3 && e3.push(...t3.refs);
            return e3;
          }
          resolve(e3, t3, r3, s2) {
            return this._template && 1 === this._template.length ? this._part(this._template[0], e3, t3, r3, s2, {}) : this.render(e3, t3, r3, s2);
          }
          _part(e3, ...t3) {
            return e3.ref ? e3.ref.resolve(...t3) : e3.formula.evaluate(t3);
          }
          render(e3, t3, r3, s2, n2 = {}) {
            if (!this.isDynamic()) return this.rendered;
            const i2 = [];
            for (const o2 of this._template) if ("string" == typeof o2) i2.push(o2);
            else {
              const l2 = this._part(o2, e3, t3, r3, s2, n2), c2 = u.stringify(l2, e3, t3, r3, s2, n2);
              if (void 0 !== c2) {
                const e4 = o2.raw || false === (n2.errors && n2.errors.escapeHtml) ? c2 : a(c2);
                i2.push(u.wrap(e4, o2.wrapped && r3.errors.wrap.label));
              }
            }
            return i2.join("");
          }
          _ref(e3, { raw: t3, wrapped: r3 }) {
            const s2 = [], n2 = (e4) => {
              const t4 = c.create(e4, this._settings);
              return s2.push(t4), (e5) => {
                const r4 = t4.resolve(...e5);
                return void 0 !== r4 ? r4 : null;
              };
            };
            try {
              const t4 = this._functions ? { ...u.functions, ...this._functions } : u.functions;
              var a2 = new i.Parser(e3, { reference: n2, functions: t4, constants: u.constants });
            } catch (t4) {
              throw t4.message = `Invalid template variable "${e3}" fails due to: ${t4.message}`, t4;
            }
            if (a2.single) {
              if ("reference" === a2.single.type) {
                const e4 = s2[0];
                return { ref: e4, raw: t3, refs: s2, wrapped: r3 || "local" === e4.type && "label" === e4.key };
              }
              return u.stringify(a2.single.value);
            }
            return { formula: a2, raw: t3, refs: s2 };
          }
          toString() {
            return this.source;
          }
        }, u.Template.prototype[o.symbols.template] = true, u.Template.prototype.isImmutable = true, u.encode = function(e3) {
          return e3.replace(/\\(\{+)/g, (e4, t3) => u.opens.slice(0, t3.length)).replace(/\\(\}+)/g, (e4, t3) => u.closes.slice(0, t3.length));
        }, u.decode = function(e3) {
          return e3.replace(/\u0000/g, "{").replace(/\u0001/g, "}");
        }, u.split = function(e3) {
          const t3 = [];
          let r3 = "";
          for (let s2 = 0; s2 < e3.length; ++s2) {
            const n2 = e3[s2];
            if ("{" === n2) {
              let n3 = "";
              for (; s2 + 1 < e3.length && "{" === e3[s2 + 1]; ) n3 += "{", ++s2;
              t3.push(r3), r3 = n3;
            } else r3 += n2;
          }
          return t3.push(r3), t3;
        }, u.wrap = function(e3, t3) {
          return t3 ? 1 === t3.length ? `${t3}${e3}${t3}` : `${t3[0]}${e3}${t3[1]}` : e3;
        }, u.stringify = function(e3, t3, r3, s2, n2, a2 = {}) {
          const i2 = typeof e3, o2 = s2 && s2.errors && s2.errors.wrap || {};
          let l2 = false;
          if (c.isRef(e3) && e3.render && (l2 = e3.in, e3 = e3.resolve(t3, r3, s2, n2, { in: e3.in, ...a2 })), null === e3) return "null";
          if ("string" === i2) return u.wrap(e3, a2.arrayItems && o2.string);
          if ("number" === i2 || "function" === i2 || "symbol" === i2) return e3.toString();
          if ("object" !== i2) return JSON.stringify(e3);
          if (e3 instanceof Date) return u.Template.date(e3, s2);
          if (e3 instanceof Map) {
            const t4 = [];
            for (const [r4, s3] of e3.entries()) t4.push(`${r4.toString()} -> ${s3.toString()}`);
            e3 = t4;
          }
          if (!Array.isArray(e3)) return e3.toString();
          const f = [];
          for (const i3 of e3) f.push(u.stringify(i3, t3, r3, s2, n2, { arrayItems: true, ...a2 }));
          return u.wrap(f.join(", "), !l2 && o2.array);
        }, u.constants = { true: true, false: false, null: null, second: 1e3, minute: 6e4, hour: 36e5, day: 864e5 }, u.functions = { if: (e3, t3, r3) => e3 ? t3 : r3, length: (e3) => "string" == typeof e3 ? e3.length : e3 && "object" == typeof e3 ? Array.isArray(e3) ? e3.length : Object.keys(e3).length : null, msg(e3) {
          const [t3, r3, s2, n2, a2] = this, i2 = a2.messages;
          if (!i2) return "";
          const o2 = l.template(t3, i2[0], e3, r3, s2) || l.template(t3, i2[1], e3, r3, s2);
          return o2 ? o2.render(t3, r3, s2, n2, a2) : "";
        }, number: (e3) => "number" == typeof e3 ? e3 : "string" == typeof e3 ? parseFloat(e3) : "boolean" == typeof e3 ? e3 ? 1 : 0 : e3 instanceof Date ? e3.getTime() : null };
      }, 4972(e2, t2, r2) {
        "use strict";
        const { assert: s, merge: n } = r2(3115), a = r2(680), i = r2(9415), o = r2(3541), l = r2(8013), c = r2(8529), u = {};
        e2.exports = a.extend({ type: "alternatives", flags: { match: { default: "any" } }, terms: { matches: { init: [], register: c.toSibling } }, args: (e3, ...t3) => 1 === t3.length && Array.isArray(t3[0]) ? e3.try(...t3[0]) : e3.try(...t3), validate(e3, t3) {
          const { schema: r3, error: s2, state: a2, prefs: i2 } = t3;
          if (r3._flags.match) {
            const t4 = [], o3 = [];
            for (let s3 = 0; s3 < r3.$_terms.matches.length; ++s3) {
              const n2 = r3.$_terms.matches[s3], l2 = a2.nest(n2.schema, `match.${s3}`);
              l2.snapshot();
              const c3 = n2.schema.$_validate(e3, l2, i2);
              c3.errors ? (o3.push(c3.errors), l2.restore()) : (t4.push(c3.value), l2.commit());
            }
            if (0 === t4.length) return { errors: s2("alternatives.any", { details: o3.map((e4) => l.details(e4, { override: false })) }) };
            if ("one" === r3._flags.match) return 1 === t4.length ? { value: t4[0] } : { errors: s2("alternatives.one") };
            if (t4.length !== r3.$_terms.matches.length) return { errors: s2("alternatives.all", { details: o3.map((e4) => l.details(e4, { override: false })) }) };
            const c2 = (e4) => e4.$_terms.matches.some((e5) => "object" === e5.schema.type || "alternatives" === e5.schema.type && c2(e5.schema));
            return c2(r3) ? { value: t4.reduce((e4, t5) => n(e4, t5, { mergeArrays: false })) } : { value: t4[t4.length - 1] };
          }
          const o2 = [];
          for (let t4 = 0; t4 < r3.$_terms.matches.length; ++t4) {
            const s3 = r3.$_terms.matches[t4];
            if (s3.schema) {
              const r4 = a2.nest(s3.schema, `match.${t4}`);
              r4.snapshot();
              const n3 = s3.schema.$_validate(e3, r4, i2);
              if (!n3.errors) return r4.commit(), n3;
              r4.restore(), o2.push({ schema: s3.schema, reports: n3.errors });
              continue;
            }
            const n2 = s3.ref ? s3.ref.resolve(e3, a2, i2) : e3, l2 = s3.is ? [s3] : s3.switch;
            for (let r4 = 0; r4 < l2.length; ++r4) {
              const o3 = l2[r4], { is: c2, then: u2, otherwise: f } = o3, m = `match.${t4}${s3.switch ? "." + r4 : ""}`;
              if (c2.$_match(n2, a2.nest(c2, `${m}.is`), i2)) {
                if (u2) return u2.$_validate(e3, a2.nest(u2, `${m}.then`), i2);
              } else if (f) return f.$_validate(e3, a2.nest(f, `${m}.otherwise`), i2);
            }
          }
          return u.errors(o2, t3);
        }, jsonSchema(e3, t3, r3, s2) {
          const n2 = [];
          for (const t4 of e3.$_terms.matches) if (t4.schema) n2.push(t4.schema.$_jsonSchema(r3, s2));
          else {
            const e4 = t4.is ? [t4] : t4.switch;
            for (const t5 of e4) t5.then && n2.push(t5.then.$_jsonSchema(r3, s2)), t5.otherwise && n2.push(t5.otherwise.$_jsonSchema(r3, s2));
          }
          var a2;
          n2.length && (delete t3.type, "one" === (null !== (a2 = e3._flags.match) && void 0 !== a2 ? a2 : "any") ? t3.oneOf = n2 : t3.anyOf = n2);
          return t3;
        }, rules: { conditional: { method(e3, t3) {
          s(!this._flags._endedSwitch, "Unreachable condition"), s(!this._flags.match, "Cannot combine match mode", this._flags.match, "with conditional rule"), s(void 0 === t3.break, "Cannot use break option with alternatives conditional");
          const r3 = this.clone(), n2 = o.when(r3, e3, t3), a2 = n2.is ? [n2] : n2.switch;
          for (const e4 of a2) if (e4.then && e4.otherwise) {
            r3.$_setFlag("_endedSwitch", true, { clone: false });
            break;
          }
          return r3.$_terms.matches.push(n2), r3.$_mutateRebuild();
        } }, match: { method(e3) {
          if (s(["any", "one", "all"].includes(e3), "Invalid alternatives match mode", e3), "any" !== e3) for (const t3 of this.$_terms.matches) s(t3.schema, "Cannot combine match mode", e3, "with conditional rules");
          return this.$_setFlag("match", e3);
        } }, try: { method(...e3) {
          s(e3.length, "Missing alternative schemas"), i.verifyFlat(e3, "try"), s(!this._flags._endedSwitch, "Unreachable condition");
          const t3 = this.clone();
          for (const r3 of e3) t3.$_terms.matches.push({ schema: t3.$_compile(r3) });
          return t3.$_mutateRebuild();
        } } }, overrides: { label(e3) {
          return this.$_parent("label", e3).$_modify({ each: (t3, r3) => "is" !== r3.path[0] && "string" != typeof t3._flags.label ? t3.label(e3) : void 0, ref: false });
        }, isAsync() {
          var e3;
          if (null !== (e3 = this.$_terms.externals) && void 0 !== e3 && e3.length) return true;
          for (const e4 of this.$_terms.matches) {
            var t3, r3, s2;
            if (null !== (t3 = e4.schema) && void 0 !== t3 && t3.isAsync()) return true;
            if (null !== (r3 = e4.then) && void 0 !== r3 && r3.isAsync()) return true;
            if (null !== (s2 = e4.otherwise) && void 0 !== s2 && s2.isAsync()) return true;
          }
          return false;
        } }, rebuild(e3) {
          e3.$_modify({ each: (t3) => {
            i.isSchema(t3) && "array" === t3.type && e3.$_setFlag("_arrayItems", true, { clone: false });
          } });
        }, manifest: { build(e3, t3) {
          if (t3.matches) for (const r3 of t3.matches) {
            const { schema: t4, ref: s2, is: n2, not: a2, then: i2, otherwise: o2 } = r3;
            e3 = t4 ? e3.try(t4) : s2 ? e3.conditional(s2, { is: n2, then: i2, not: a2, otherwise: o2, switch: r3.switch }) : e3.conditional(n2, { then: i2, otherwise: o2 });
          }
          return e3;
        } }, messages: { "alternatives.all": "{{#label}} does not match all of the required types", "alternatives.any": "{{#label}} does not match any of the allowed types", "alternatives.match": "{{#label}} does not match any of the allowed types", "alternatives.one": "{{#label}} matches more than one allowed type", "alternatives.types": "{{#label}} must be one of {{#types}}" } }), u.errors = function(e3, { error: t3, state: r3 }) {
          if (!e3.length) return { errors: t3("alternatives.any") };
          if (1 === e3.length) return { errors: e3[0].reports };
          const s2 = /* @__PURE__ */ new Set(), n2 = [];
          for (const { reports: a2, schema: i2 } of e3) {
            if (a2.length > 1) return u.unmatched(e3, t3);
            const o2 = a2[0];
            if (o2 instanceof l.Report == 0) return u.unmatched(e3, t3);
            if (o2.state.path.length !== r3.path.length) {
              n2.push({ type: i2.type, report: o2 });
              continue;
            }
            if ("any.only" === o2.code) {
              for (const e4 of o2.local.valids) s2.add(e4);
              continue;
            }
            const [c2, f] = o2.code.split(".");
            "base" !== f ? n2.push({ type: i2.type, report: o2 }) : "object.base" === o2.code ? s2.add(o2.local.type) : s2.add(c2);
          }
          return n2.length ? 1 === n2.length ? { errors: n2[0].report } : u.unmatched(e3, t3) : { errors: t3("alternatives.types", { types: [...s2] }) };
        }, u.unmatched = function(e3, t3) {
          const r3 = [];
          for (const t4 of e3) r3.push(...t4.reports);
          return { errors: t3("alternatives.match", l.details(r3, { override: false })) };
        };
      }, 680(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(2115), a = r2(9415), i = r2(6162);
        e2.exports = n.extend({ type: "any", flags: { only: { default: false } }, terms: { alterations: { init: null }, examples: { init: null }, externals: { init: null }, metas: { init: [] }, notes: { init: [] }, shared: { init: null }, tags: { init: [] }, whens: { init: null } }, rules: { custom: { method(e3, t3) {
          return s("function" == typeof e3, "Method must be a function"), s(void 0 === t3 || t3 && "string" == typeof t3, "Description must be a non-empty string"), this.$_addRule({ name: "custom", args: { method: e3, description: t3 } });
        }, validate(e3, t3, { method: r3 }) {
          try {
            return r3(e3, t3);
          } catch (e4) {
            return t3.error("any.custom", { error: e4 });
          }
        }, args: ["method", "description"], multi: true }, messages: { method(e3) {
          return this.prefs({ messages: e3 });
        } }, shared: { method(e3) {
          s(a.isSchema(e3) && e3._flags.id, "Schema must be a schema with an id");
          const t3 = this.clone();
          return t3.$_terms.shared = t3.$_terms.shared || [], t3.$_terms.shared.push(e3), t3.$_mutateRegister(e3), t3;
        } }, warning: { method(e3, t3) {
          return s(e3 && "string" == typeof e3, "Invalid warning code"), this.$_addRule({ name: "warning", args: { code: e3, local: t3 }, warn: true });
        }, validate: (e3, t3, { code: r3, local: s2 }) => t3.error(r3, s2), args: ["code", "local"], multi: true } }, modifiers: { keep(e3, t3 = true) {
          e3.keep = t3;
        }, message(e3, t3) {
          e3.message = i.compile(t3);
        }, warn(e3, t3 = true) {
          e3.warn = t3;
        } }, manifest: { build(e3, t3) {
          for (const r3 in t3) {
            const s2 = t3[r3];
            if (["examples", "externals", "metas", "notes", "tags"].includes(r3)) for (const t4 of s2) e3 = e3[r3.slice(0, -1)](t4);
            else {
              if ("alterations" === r3) {
                const t4 = {};
                for (const { target: e4, adjuster: r4 } of s2) t4[e4] = r4;
                e3 = e3.alter(t4);
                continue;
              }
              if ("whens" !== r3) {
                if ("shared" === r3) for (const t4 of s2) e3 = e3.shared(t4);
              } else for (const t4 of s2) {
                const { ref: r4, is: s3, not: n2, then: a2, otherwise: i2, concat: o } = t4;
                e3 = o ? e3.concat(o) : r4 ? e3.when(r4, { is: s3, not: n2, then: a2, otherwise: i2, switch: t4.switch, break: t4.break }) : e3.when(s3, { then: a2, otherwise: i2, break: t4.break });
              }
            }
          }
          return e3;
        } }, messages: { "any.custom": "{{#label}} failed custom validation because {{#error.message}}", "any.default": "{{#label}} threw an error when running default method", "any.failover": "{{#label}} threw an error when running failover method", "any.invalid": "{{#label}} contains an invalid value", "any.only": '{{#label}} must be {if(#valids.length == 1, "", "one of ")}{{#valids}}', "any.ref": "{{#label}} {{#arg}} references {{:#ref}} which {{#reason}}", "any.required": "{{#label}} is required", "any.unknown": "{{#label}} is not allowed" } });
      }, 2591(e2, t2, r2) {
        "use strict";
        const { assert: s, deepEqual: n, reach: a } = r2(3115), i = r2(680), o = r2(9415), l = r2(3541), c = {};
        e2.exports = i.extend({ type: "array", flags: { single: { default: false }, sparse: { default: false } }, terms: { items: { init: [], manifest: "schema" }, ordered: { init: [], manifest: "schema" }, _exclusions: { init: [] }, _inclusions: { init: [] }, _requireds: { init: [] } }, coerce: { from: "object", method(e3, { schema: t3, state: r3, prefs: s2 }) {
          if (!Array.isArray(e3)) return;
          const n2 = t3.$_getRule("sort");
          return n2 ? c.sort(t3, e3, n2.args.options, r3, s2) : void 0;
        } }, validate(e3, { schema: t3, error: r3 }) {
          if (!Array.isArray(e3)) {
            if (t3._flags.single) {
              const t4 = [e3];
              return t4[o.symbols.arraySingle] = true, { value: t4 };
            }
            return { errors: r3("array.base") };
          }
          if (t3.$_getRule("items") || t3.$_terms.externals) return { value: e3.slice() };
        }, jsonSchema(e3, t3, r3, s2) {
          const n2 = e3.$_terms.ordered;
          if (n2.length && (t3.prefixItems = n2.map((e4) => e4.$_jsonSchema(r3, s2))), e3.$_terms.items.length) {
            let a3;
            a3 = 1 === e3.$_terms.items.length ? e3.$_terms.items[0].$_jsonSchema(r3, s2) : { anyOf: e3.$_terms.items.map((e4) => e4.$_jsonSchema(r3, s2)) }, n2.length ? (t3.unevaluatedItems = a3, t3.minItems = n2.length) : t3.items = a3;
          } else n2.length && (t3.unevaluatedItems = false, t3.minItems = n2.length, t3.maxItems = n2.length);
          const a2 = [];
          for (const t4 of e3._rules) "has" === t4.name && a2.push(t4.args.schema.$_jsonSchema(r3, s2));
          if (a2.length && (1 === a2.length ? t3.contains = a2[0] : t3.allOf = a2.map((e4) => ({ contains: e4 }))), e3._flags.single && e3.$_terms.items.length) {
            let n3;
            n3 = 1 === e3.$_terms.items.length ? e3.$_terms.items[0].$_jsonSchema(r3, s2) : { anyOf: e3.$_terms.items.map((e4) => e4.$_jsonSchema(r3, s2)) }, t3 = { anyOf: [t3, n3] };
          }
          return t3;
        }, rules: { has: { method(e3) {
          e3 = this.$_compile(e3, { appendPath: true });
          const t3 = this.$_addRule({ name: "has", args: { schema: e3 } });
          return t3.$_mutateRegister(e3), t3;
        }, validate(e3, { state: t3, prefs: r3, error: s2 }, { schema: n2 }) {
          const a2 = [e3, ...t3.ancestors];
          for (let s3 = 0; s3 < e3.length; ++s3) {
            const i3 = t3.localize([...t3.path, s3], a2, n2);
            if (n2.$_match(e3[s3], i3, r3)) return e3;
          }
          const i2 = n2._flags.label;
          return i2 ? s2("array.hasKnown", { patternLabel: i2 }) : s2("array.hasUnknown", null);
        }, multi: true }, items: { method(...e3) {
          o.verifyFlat(e3, "items");
          const t3 = this.$_addRule("items");
          for (let r3 = 0; r3 < e3.length; ++r3) {
            const s2 = o.tryWithPath(() => this.$_compile(e3[r3]), r3, { append: true });
            t3.$_terms.items.push(s2);
          }
          return t3.$_mutateRebuild();
        }, validate(e3, { schema: t3, error: r3, state: s2, prefs: n2, errorsArray: a2 }) {
          const i2 = t3.$_terms._requireds.slice(), l2 = t3.$_terms.ordered.slice(), u = [...t3.$_terms._inclusions, ...i2], f = !e3[o.symbols.arraySingle];
          delete e3[o.symbols.arraySingle];
          const m = a2();
          let h = e3.length;
          for (let a3 = 0; a3 < h; ++a3) {
            const o2 = e3[a3];
            let p = false, d = false;
            const g = f ? a3 : new Number(a3), y = [...s2.path, g];
            if (!t3._flags.sparse && void 0 === o2) {
              if (m.push(r3("array.sparse", { key: g, path: y, pos: a3, value: void 0 }, s2.localize(y))), n2.abortEarly) return m;
              l2.shift();
              continue;
            }
            const b = [e3, ...s2.ancestors];
            for (const e4 of t3.$_terms._exclusions) if (e4.$_match(o2, s2.localize(y, b, e4), n2, { presence: "ignore" })) {
              if (m.push(r3("array.excludes", { pos: a3, value: o2 }, s2.localize(y))), n2.abortEarly) return m;
              p = true, l2.shift();
              break;
            }
            if (p) continue;
            if (t3.$_terms.ordered.length) {
              if (l2.length) {
                const i3 = l2.shift(), u2 = i3.$_validate(o2, s2.localize(y, b, i3), n2);
                if (u2.errors) {
                  if (m.push(...u2.errors), n2.abortEarly) return m;
                } else if ("strip" === i3._flags.result) c.fastSplice(e3, a3), --a3, --h;
                else {
                  if (!t3._flags.sparse && void 0 === u2.value) {
                    if (m.push(r3("array.sparse", { key: g, path: y, pos: a3, value: void 0 }, s2.localize(y))), n2.abortEarly) return m;
                    continue;
                  }
                  e3[a3] = u2.value;
                }
                continue;
              }
              if (!t3.$_terms.items.length) {
                if (m.push(r3("array.orderedLength", { pos: a3, limit: t3.$_terms.ordered.length })), n2.abortEarly) return m;
                break;
              }
            }
            const v = [];
            let _ = i2.length;
            for (let l3 = 0; l3 < _; ++l3) {
              const u2 = s2.localize(y, b, i2[l3]);
              u2.snapshot();
              const f2 = i2[l3].$_validate(o2, u2, n2);
              if (v[l3] = f2, !f2.errors) {
                if (u2.commit(), e3[a3] = f2.value, d = true, c.fastSplice(i2, l3), --l3, --_, !t3._flags.sparse && void 0 === f2.value && (m.push(r3("array.sparse", { key: g, path: y, pos: a3, value: void 0 }, s2.localize(y))), n2.abortEarly)) return m;
                break;
              }
              u2.restore();
            }
            if (d) continue;
            const A = n2.stripUnknown && !!n2.stripUnknown.arrays || false;
            _ = u.length;
            for (const l3 of u) {
              let u2;
              const f2 = i2.indexOf(l3);
              if (-1 !== f2) u2 = v[f2];
              else {
                const i3 = s2.localize(y, b, l3);
                if (i3.snapshot(), u2 = l3.$_validate(o2, i3, n2), !u2.errors) {
                  i3.commit(), "strip" === l3._flags.result ? (c.fastSplice(e3, a3), --a3, --h) : t3._flags.sparse || void 0 !== u2.value ? e3[a3] = u2.value : (m.push(r3("array.sparse", { key: g, path: y, pos: a3, value: void 0 }, s2.localize(y))), p = true), d = true;
                  break;
                }
                i3.restore();
              }
              if (1 === _) {
                if (A) {
                  c.fastSplice(e3, a3), --a3, --h, d = true;
                  break;
                }
                if (m.push(...u2.errors), n2.abortEarly) return m;
                p = true;
                break;
              }
            }
            if (!p && (t3.$_terms._inclusions.length || t3.$_terms._requireds.length) && !d) {
              if (A) {
                c.fastSplice(e3, a3), --a3, --h;
                continue;
              }
              if (m.push(r3("array.includes", { pos: a3, value: o2 }, s2.localize(y))), n2.abortEarly) return m;
            }
          }
          return i2.length && c.fillMissedErrors(t3, m, i2, e3, s2, n2), l2.length && (c.fillOrderedErrors(t3, m, l2, e3, s2, n2), m.length || c.fillDefault(l2, e3, s2, n2)), m.length ? m : e3;
        }, priority: true, manifest: false }, length: { method(e3) {
          return this.$_addRule({ name: "length", args: { limit: e3 }, operator: "=" });
        }, validate: (e3, t3, { limit: r3 }, { name: s2, operator: n2, args: a2 }) => o.compare(e3.length, r3, n2) ? e3 : t3.error("array." + s2, { limit: a2.limit, value: e3 }), jsonSchema: (e3, t3) => (t3.minItems = e3.args.limit, t3.maxItems = e3.args.limit, t3), args: [{ name: "limit", ref: true, assert: o.limit, message: "must be a positive integer" }] }, max: { method(e3) {
          return this.$_addRule({ name: "max", method: "length", args: { limit: e3 }, operator: "<=" });
        }, jsonSchema: (e3, t3) => (t3.maxItems = e3.args.limit, t3) }, min: { method(e3) {
          return this.$_addRule({ name: "min", method: "length", args: { limit: e3 }, operator: ">=" });
        }, jsonSchema: (e3, t3) => (t3.minItems = e3.args.limit, t3) }, ordered: { method(...e3) {
          o.verifyFlat(e3, "ordered");
          const t3 = this.$_addRule("items");
          for (let r3 = 0; r3 < e3.length; ++r3) {
            const s2 = o.tryWithPath(() => this.$_compile(e3[r3]), r3, { append: true });
            c.validateSingle(s2, t3), t3.$_mutateRegister(s2), t3.$_terms.ordered.push(s2);
          }
          return t3.$_mutateRebuild();
        } }, single: { method(e3) {
          const t3 = void 0 === e3 || !!e3;
          return s(!t3 || !this._flags._arrayItems, "Cannot specify single rule when array has array items"), this.$_setFlag("single", t3);
        } }, sort: { method(e3 = {}) {
          o.assertOptions(e3, ["by", "order"]);
          const t3 = { order: e3.order || "ascending" };
          return e3.by && (t3.by = l.ref(e3.by, { ancestor: 0 }), s(!t3.by.ancestor, "Cannot sort by ancestor")), this.$_addRule({ name: "sort", args: { options: t3 } });
        }, validate(e3, { error: t3, state: r3, prefs: s2, schema: n2 }, { options: a2 }) {
          const { value: i2, errors: o2 } = c.sort(n2, e3, a2, r3, s2);
          if (o2) return o2;
          for (let r4 = 0; r4 < e3.length; ++r4) if (e3[r4] !== i2[r4]) return t3("array.sort", { order: a2.order, by: a2.by ? a2.by.key : "value" });
          return e3;
        }, convert: true }, sparse: { method(e3) {
          const t3 = void 0 === e3 || !!e3;
          return this._flags.sparse === t3 ? this : (t3 ? this.clone() : this.$_addRule("items")).$_setFlag("sparse", t3, { clone: false });
        } }, unique: { method(e3, t3 = {}) {
          s(!e3 || "function" == typeof e3 || "string" == typeof e3, "comparator must be a function or a string"), o.assertOptions(t3, ["ignoreUndefined", "separator"]);
          const r3 = { name: "unique", args: { options: t3, comparator: e3 } };
          if (e3) if ("string" == typeof e3) {
            const s2 = o.default(t3.separator, ".");
            r3.path = s2 ? e3.split(s2) : [e3];
          } else r3.comparator = e3;
          return this.$_addRule(r3);
        }, validate(e3, { state: t3, error: r3, schema: i2 }, { comparator: o2, options: l2 }, { comparator: c2, path: u }) {
          const f = { string: /* @__PURE__ */ Object.create(null), number: /* @__PURE__ */ Object.create(null), undefined: /* @__PURE__ */ Object.create(null), boolean: /* @__PURE__ */ Object.create(null), bigint: /* @__PURE__ */ Object.create(null), object: /* @__PURE__ */ new Map(), function: /* @__PURE__ */ new Map(), custom: /* @__PURE__ */ new Map() }, m = c2 || n, h = l2.ignoreUndefined;
          for (let n2 = 0; n2 < e3.length; ++n2) {
            const i3 = u ? a(e3[n2], u) : e3[n2], l3 = c2 ? f.custom : f[typeof i3];
            if (s(l3, "Failed to find unique map container for type", typeof i3), l3 instanceof Map) {
              const s2 = l3.entries();
              let a2;
              for (; !(a2 = s2.next()).done; ) if (m(a2.value[0], i3)) {
                const s3 = t3.localize([...t3.path, n2], [e3, ...t3.ancestors]), i4 = { pos: n2, value: e3[n2], dupePos: a2.value[1], dupeValue: e3[a2.value[1]] };
                return u && (i4.path = o2), r3("array.unique", i4, s3);
              }
              l3.set(i3, n2);
            } else {
              if ((!h || void 0 !== i3) && void 0 !== l3[i3]) {
                const s2 = { pos: n2, value: e3[n2], dupePos: l3[i3], dupeValue: e3[l3[i3]] };
                return u && (s2.path = o2), r3("array.unique", s2, t3.localize([...t3.path, n2], [e3, ...t3.ancestors]));
              }
              l3[i3] = n2;
            }
          }
          return e3;
        }, jsonSchema: (e3, t3) => (t3.uniqueItems = true, t3), args: ["comparator", "options"], multi: true } }, overrides: { isAsync() {
          var e3;
          if (null !== (e3 = this.$_terms.externals) && void 0 !== e3 && e3.length) return true;
          for (const e4 of this.$_terms.items) if (e4.isAsync()) return true;
          for (const e4 of this.$_terms.ordered) if (e4.isAsync()) return true;
          return false;
        } }, cast: { set: { from: Array.isArray, to: (e3, t3) => new Set(e3) } }, rebuild(e3) {
          e3.$_terms._inclusions = [], e3.$_terms._exclusions = [], e3.$_terms._requireds = [];
          for (const t3 of e3.$_terms.items) c.validateSingle(t3, e3), "required" === t3._flags.presence ? e3.$_terms._requireds.push(t3) : "forbidden" === t3._flags.presence ? e3.$_terms._exclusions.push(t3) : e3.$_terms._inclusions.push(t3);
          for (const t3 of e3.$_terms.ordered) c.validateSingle(t3, e3);
        }, manifest: { build: (e3, t3) => (t3.items && (e3 = e3.items(...t3.items)), t3.ordered && (e3 = e3.ordered(...t3.ordered)), e3) }, messages: { "array.base": "{{#label}} must be an array", "array.excludes": "{{#label}} contains an excluded value", "array.hasKnown": "{{#label}} does not contain at least one required match for type {:#patternLabel}", "array.hasUnknown": "{{#label}} does not contain at least one required match", "array.includes": "{{#label}} does not match any of the allowed types", "array.includesRequiredBoth": "{{#label}} does not contain {{#knownMisses}} and {{#unknownMisses}} other required value(s)", "array.includesRequiredKnowns": "{{#label}} does not contain {{#knownMisses}}", "array.includesRequiredUnknowns": "{{#label}} does not contain {{#unknownMisses}} required value(s)", "array.length": "{{#label}} must contain {{#limit}} items", "array.max": "{{#label}} must contain less than or equal to {{#limit}} items", "array.min": "{{#label}} must contain at least {{#limit}} items", "array.orderedLength": "{{#label}} must contain at most {{#limit}} items", "array.sort": "{{#label}} must be sorted in {#order} order by {{#by}}", "array.sort.mismatching": "{{#label}} cannot be sorted due to mismatching types", "array.sort.unsupported": "{{#label}} cannot be sorted due to unsupported type {#type}", "array.sparse": "{{#label}} must not be a sparse array item", "array.unique": "{{#label}} contains a duplicate value" } }), c.fillMissedErrors = function(e3, t3, r3, s2, n2, a2) {
          const i2 = [];
          let o2 = 0;
          for (const e4 of r3) {
            const t4 = e4._flags.label;
            t4 ? i2.push(t4) : ++o2;
          }
          i2.length ? o2 ? t3.push(e3.$_createError("array.includesRequiredBoth", s2, { knownMisses: i2, unknownMisses: o2 }, n2, a2)) : t3.push(e3.$_createError("array.includesRequiredKnowns", s2, { knownMisses: i2 }, n2, a2)) : t3.push(e3.$_createError("array.includesRequiredUnknowns", s2, { unknownMisses: o2 }, n2, a2));
        }, c.fillOrderedErrors = function(e3, t3, r3, s2, n2, a2) {
          const i2 = [];
          for (const e4 of r3) "required" === e4._flags.presence && i2.push(e4);
          i2.length && c.fillMissedErrors(e3, t3, i2, s2, n2, a2);
        }, c.fillDefault = function(e3, t3, r3, s2) {
          const n2 = [];
          let a2 = true;
          for (let i2 = e3.length - 1; i2 >= 0; --i2) {
            const o2 = e3[i2], l2 = [t3, ...r3.ancestors], c2 = o2.$_validate(void 0, r3.localize(r3.path, l2, o2), s2).value;
            if (a2) {
              if (void 0 === c2) continue;
              a2 = false;
            }
            n2.unshift(c2);
          }
          n2.length && t3.push(...n2);
        }, c.fastSplice = function(e3, t3) {
          let r3 = t3;
          for (; r3 < e3.length; ) e3[r3++] = e3[r3];
          --e3.length;
        }, c.validateSingle = function(e3, t3) {
          ("array" === e3.type || e3._flags._arrayItems) && (s(!t3._flags.single, "Cannot specify array item with single rule enabled"), t3.$_setFlag("_arrayItems", true, { clone: false }));
        }, c.sort = function(e3, t3, r3, s2, n2) {
          const a2 = "ascending" === r3.order ? 1 : -1, i2 = -1 * a2, o2 = a2, l2 = (l3, u) => {
            let f = c.compare(l3, u, i2, o2);
            if (null !== f) return f;
            if (r3.by && (l3 = r3.by.resolve(l3, s2, n2), u = r3.by.resolve(u, s2, n2)), f = c.compare(l3, u, i2, o2), null !== f) return f;
            const m = typeof l3;
            if (m !== typeof u) throw e3.$_createError("array.sort.mismatching", t3, null, s2, n2);
            if ("number" !== m && "string" !== m) throw e3.$_createError("array.sort.unsupported", t3, { type: m }, s2, n2);
            return "number" === m ? (l3 - u) * a2 : l3 < u ? i2 : o2;
          };
          try {
            return { value: t3.slice().sort(l2) };
          } catch (e4) {
            return { errors: e4 };
          }
        }, c.compare = function(e3, t3, r3, s2) {
          return e3 === t3 ? 0 : void 0 === e3 ? 1 : void 0 === t3 ? -1 : null === e3 ? s2 : null === t3 ? r3 : null;
        };
      }, 6186(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(680), a = r2(9415), i = r2(6220), o = { isBool: function(e3) {
          return "boolean" == typeof e3;
        } };
        e2.exports = n.extend({ type: "boolean", flags: { sensitive: { default: false } }, terms: { falsy: { init: null, manifest: "values" }, truthy: { init: null, manifest: "values" } }, coerce(e3, { schema: t3 }) {
          if ("boolean" != typeof e3) {
            if ("string" == typeof e3) {
              const r3 = e3.trim(), s2 = t3._flags.sensitive ? r3 : r3.toLowerCase();
              e3 = "true" === s2 || "false" !== s2 && e3;
            }
            return "boolean" != typeof e3 && (e3 = t3.$_terms.truthy && t3.$_terms.truthy.has(e3, null, null, !t3._flags.sensitive) || (!t3.$_terms.falsy || !t3.$_terms.falsy.has(e3, null, null, !t3._flags.sensitive)) && e3), { value: e3 };
          }
        }, validate(e3, { error: t3 }) {
          if ("boolean" != typeof e3) return { value: e3, errors: t3("boolean.base") };
        }, rules: { truthy: { method(...e3) {
          a.verifyFlat(e3, "truthy");
          const t3 = this.clone();
          t3.$_terms.truthy = t3.$_terms.truthy || new i();
          for (let r3 = 0; r3 < e3.length; ++r3) {
            const n2 = e3[r3];
            s(void 0 !== n2, "Cannot call truthy with undefined"), t3.$_terms.truthy.add(n2);
          }
          return t3;
        } }, falsy: { method(...e3) {
          a.verifyFlat(e3, "falsy");
          const t3 = this.clone();
          t3.$_terms.falsy = t3.$_terms.falsy || new i();
          for (let r3 = 0; r3 < e3.length; ++r3) {
            const n2 = e3[r3];
            s(void 0 !== n2, "Cannot call falsy with undefined"), t3.$_terms.falsy.add(n2);
          }
          return t3;
        } }, sensitive: { method(e3 = true) {
          return this.$_setFlag("sensitive", e3);
        } } }, cast: { number: { from: o.isBool, to: (e3, t3) => e3 ? 1 : 0 }, string: { from: o.isBool, to: (e3, t3) => e3 ? "true" : "false" } }, manifest: { build: (e3, t3) => (t3.truthy && (e3 = e3.truthy(...t3.truthy)), t3.falsy && (e3 = e3.falsy(...t3.falsy)), e3) }, messages: { "boolean.base": "{{#label}} must be a boolean" } });
      }, 2588(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(680), a = r2(9415), i = r2(1532), o = { formats: ["iso", "javascript", "unix"], isDate: function(e3) {
          return e3 instanceof Date;
        } };
        e2.exports = n.extend({ type: "date", coerce: { from: ["number", "string"], method: (e3, { schema: t3 }) => ({ value: o.parse(e3, t3._flags.format) || e3 }) }, validate(e3, { schema: t3, error: r3, prefs: s2 }) {
          if (e3 instanceof Date && !isNaN(e3.getTime())) return;
          const n2 = t3._flags.format;
          return s2.convert && n2 && "string" == typeof e3 ? { value: e3, errors: r3("date.format", { format: n2 }) } : { value: e3, errors: r3("date.base") };
        }, jsonSchema: (e3, t3, r3, s2) => (t3.type = "string", t3.format = "date-time", t3), rules: { compare: { method: false, validate(e3, t3, { date: r3 }, { name: s2, operator: n2, args: i2 }) {
          const o2 = "now" === r3 ? Date.now() : r3.getTime();
          return a.compare(e3.getTime(), o2, n2) ? e3 : t3.error("date." + s2, { limit: i2.date, value: e3 });
        }, args: [{ name: "date", ref: true, normalize: (e3) => "now" === e3 ? e3 : o.parse(e3), assert: (e3) => null !== e3, message: "must have a valid date format" }] }, format: { method(e3) {
          return s(o.formats.includes(e3), "Unknown date format", e3), this.$_setFlag("format", e3);
        } }, greater: { method(e3) {
          return this.$_addRule({ name: "greater", method: "compare", args: { date: e3 }, operator: ">" });
        }, jsonSchema(e3, t3) {
          const r3 = e3.args.date;
          return r3 instanceof Date && (t3["x-constraint"] = { ...t3["x-constraint"], greater: r3.toISOString() }), t3;
        } }, iso: { method() {
          return this.format("iso");
        } }, less: { method(e3) {
          return this.$_addRule({ name: "less", method: "compare", args: { date: e3 }, operator: "<" });
        }, jsonSchema(e3, t3) {
          const r3 = e3.args.date;
          return r3 instanceof Date && (t3["x-constraint"] = { ...t3["x-constraint"], less: r3.toISOString() }), t3;
        } }, max: { method(e3) {
          return this.$_addRule({ name: "max", method: "compare", args: { date: e3 }, operator: "<=" });
        }, jsonSchema(e3, t3) {
          const r3 = e3.args.date;
          return r3 instanceof Date && (t3["x-constraint"] = { ...t3["x-constraint"], max: r3.toISOString() }), t3;
        } }, min: { method(e3) {
          return this.$_addRule({ name: "min", method: "compare", args: { date: e3 }, operator: ">=" });
        }, jsonSchema(e3, t3) {
          const r3 = e3.args.date;
          return r3 instanceof Date && (t3["x-constraint"] = { ...t3["x-constraint"], min: r3.toISOString() }), t3;
        } }, timestamp: { method(e3 = "javascript") {
          return s(["javascript", "unix"].includes(e3), '"type" must be one of "javascript, unix"'), this.format(e3);
        } } }, cast: { number: { from: o.isDate, to: (e3, t3) => e3.getTime() }, string: { from: o.isDate, to: (e3, { prefs: t3 }) => i.date(e3, t3) } }, messages: { "date.base": "{{#label}} must be a valid date", "date.format": '{{#label}} must be in {msg("date.format." + #format) || #format} format', "date.greater": "{{#label}} must be greater than {{:#limit}}", "date.less": "{{#label}} must be less than {{:#limit}}", "date.max": "{{#label}} must be less than or equal to {{:#limit}}", "date.min": "{{#label}} must be greater than or equal to {{:#limit}}", "date.format.iso": "ISO 8601 date", "date.format.javascript": "timestamp or number of milliseconds", "date.format.unix": "timestamp or number of seconds" } }), o.parse = function(e3, t3) {
          if (e3 instanceof Date) return e3;
          if ("string" != typeof e3 && (isNaN(e3) || !isFinite(e3))) return null;
          if (/^\s*$/.test(e3)) return null;
          if ("iso" === t3) return a.isIsoDate(e3) ? o.date(e3.toString()) : null;
          const r3 = e3;
          if ("string" == typeof e3 && /^[+-]?\d+(\.\d+)?$/.test(e3) && (e3 = parseFloat(e3)), t3) {
            if ("javascript" === t3) return o.date(1 * e3);
            if ("unix" === t3) return o.date(1e3 * e3);
            if ("string" == typeof r3) return null;
          }
          return o.date(e3);
        }, o.date = function(e3) {
          const t3 = new Date(e3);
          return isNaN(t3.getTime()) ? null : t3;
        };
      }, 4840(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(2888);
        e2.exports = n.extend({ type: "function", properties: { typeof: "function" }, rules: { arity: { method(e3) {
          return s(Number.isSafeInteger(e3) && e3 >= 0, "n must be a positive integer"), this.$_addRule({ name: "arity", args: { n: e3 } });
        }, validate: (e3, t3, { n: r3 }) => e3.length === r3 ? e3 : t3.error("function.arity", { n: r3 }) }, class: { method() {
          return this.$_addRule("class");
        }, validate: (e3, t3) => /^\s*class\s/.test(e3.toString()) ? e3 : t3.error("function.class", { value: e3 }) }, minArity: { method(e3) {
          return s(Number.isSafeInteger(e3) && e3 > 0, "n must be a strict positive integer"), this.$_addRule({ name: "minArity", args: { n: e3 } });
        }, validate: (e3, t3, { n: r3 }) => e3.length >= r3 ? e3 : t3.error("function.minArity", { n: r3 }) }, maxArity: { method(e3) {
          return s(Number.isSafeInteger(e3) && e3 >= 0, "n must be a positive integer"), this.$_addRule({ name: "maxArity", args: { n: e3 } });
        }, validate: (e3, t3, { n: r3 }) => e3.length <= r3 ? e3 : t3.error("function.maxArity", { n: r3 }) } }, messages: { "function.arity": "{{#label}} must have an arity of {{#n}}", "function.class": "{{#label}} must be a class", "function.maxArity": "{{#label}} must have an arity lesser or equal to {{#n}}", "function.minArity": "{{#label}} must have an arity greater or equal to {{#n}}" } });
      }, 2888(e2, t2, r2) {
        "use strict";
        const { applyToDefaults: s, assert: n, clone: a } = r2(3115), i = r2(8248), o = r2(680), l = r2(9415), c = r2(3541), u = r2(8013), f = r2(8529), m = r2(1532), h = { renameDefaults: { alias: false, multiple: false, override: false } };
        e2.exports = o.extend({ type: "_keys", properties: { typeof: "object" }, flags: { unknown: { default: void 0 } }, terms: { dependencies: { init: null }, keys: { init: null, manifest: { mapped: { from: "schema", to: "key" } } }, patterns: { init: null }, renames: { init: null } }, args: (e3, t3) => e3.keys(t3), jsonSchema(e3, t3, r3, s2) {
          if (t3.type = "object", e3.$_terms.keys) {
            t3.properties = {};
            const n2 = [];
            for (const a2 of e3.$_terms.keys) {
              const e4 = a2.schema.$_jsonSchema(r3, s2);
              t3.properties[a2.key] = e4, ("required" === a2.schema._flags.presence || "output" === r3 && void 0 !== a2.schema._flags.default) && n2.push(a2.key);
            }
            n2.length && (t3.required = n2.sort());
          }
          if (e3.$_terms.patterns) {
            const n2 = {};
            for (const a2 of e3.$_terms.patterns) a2.regex ? n2[a2.regex.source] = a2.rule.$_jsonSchema(r3, s2) : "any" === a2.schema.type ? t3.additionalProperties = a2.rule.$_jsonSchema(r3, s2) : n2[".*"] = a2.rule.$_jsonSchema(r3, s2);
            Object.keys(n2).length && (t3.patternProperties = n2);
          }
          return void 0 === t3.additionalProperties && false == (true === e3._flags.unknown || void 0 === e3._flags.unknown && !e3.$_terms.keys && !e3.$_terms.patterns && !e3._flags.only) && (t3.additionalProperties = false), t3;
        }, validate(e3, { schema: t3, error: r3, state: s2, prefs: n2 }) {
          if (!e3 || typeof e3 !== t3.$_property("typeof") || Array.isArray(e3)) return { value: e3, errors: r3("object.base", { type: t3.$_property("typeof") }) };
          if (!(t3.$_terms.renames || t3.$_terms.dependencies || t3.$_terms.keys || t3.$_terms.patterns || t3.$_terms.externals)) return;
          e3 = h.clone(e3, n2);
          const a2 = [];
          if (t3.$_terms.renames && !h.rename(t3, e3, s2, n2, a2)) return { value: e3, errors: a2 };
          if (!t3.$_terms.keys && !t3.$_terms.patterns && !t3.$_terms.dependencies) return { value: e3, errors: a2 };
          const i2 = new Set(Object.keys(e3));
          if (t3.$_terms.keys) {
            const r4 = [e3, ...s2.ancestors];
            for (const o2 of t3.$_terms.keys) {
              const t4 = o2.key, l2 = e3[t4];
              i2.delete(t4);
              const c2 = s2.localize([...s2.path, t4], r4, o2), u2 = o2.schema.$_validate(l2, c2, n2);
              if (u2.errors) {
                if (n2.abortEarly) return { value: e3, errors: u2.errors };
                void 0 !== u2.value && (e3[t4] = u2.value), a2.push(...u2.errors);
              } else "strip" === o2.schema._flags.result || void 0 === u2.value && void 0 !== l2 ? delete e3[t4] : void 0 !== u2.value && (e3[t4] = u2.value);
            }
          }
          if (i2.size || t3._flags._hasPatternMatch) {
            const r4 = h.unknown(t3, e3, i2, a2, s2, n2);
            if (r4) return r4;
          }
          if (t3.$_terms.dependencies) for (const r4 of t3.$_terms.dependencies) {
            if (null !== r4.key && false === h.isPresent(r4.options)(r4.key.resolve(e3, s2, n2, null, { shadow: false }))) continue;
            const i3 = h.dependencies[r4.rel](t3, r4, e3, s2, n2);
            if (i3) {
              const r5 = t3.$_createError(i3.code, e3, i3.context, s2, n2);
              if (n2.abortEarly) return { value: e3, errors: r5 };
              a2.push(r5);
            }
          }
          return { value: e3, errors: a2 };
        }, rules: { and: { method(...e3) {
          return l.verifyFlat(e3, "and"), h.dependency(this, "and", null, e3);
        } }, append: { method(e3) {
          return null == e3 || 0 === Object.keys(e3).length ? this : this.keys(e3);
        } }, assert: { method(e3, t3, r3) {
          m.isTemplate(e3) || (e3 = c.ref(e3)), n(void 0 === r3 || "string" == typeof r3, "Message must be a string"), t3 = this.$_compile(t3, { appendPath: true });
          const s2 = this.$_addRule({ name: "assert", args: { subject: e3, schema: t3, message: r3 } });
          return s2.$_mutateRegister(e3), s2.$_mutateRegister(t3), s2;
        }, validate(e3, { error: t3, prefs: r3, state: s2 }, { subject: n2, schema: a2, message: i2 }) {
          const o2 = n2.resolve(e3, s2, r3), l2 = f.isRef(n2) ? n2.absolute(s2) : [];
          return a2.$_match(o2, s2.localize(l2, [e3, ...s2.ancestors], a2), r3) ? e3 : t3("object.assert", { subject: n2, message: i2 });
        }, args: ["subject", "schema", "message"], multi: true }, instance: { method(e3, t3) {
          return n("function" == typeof e3, "constructor must be a function"), t3 = t3 || e3.name, this.$_addRule({ name: "instance", args: { constructor: e3, name: t3 } });
        }, validate: (e3, t3, { constructor: r3, name: s2 }) => e3 instanceof r3 ? e3 : t3.error("object.instance", { type: s2, value: e3 }), args: ["constructor", "name"] }, keys: { method(e3) {
          n(void 0 === e3 || "object" == typeof e3, "Object schema must be a valid object"), n(!l.isSchema(e3), "Object schema cannot be a joi schema");
          const t3 = this.clone();
          if (e3) if (Object.keys(e3).length) {
            t3.$_terms.keys = t3.$_terms.keys ? t3.$_terms.keys.filter((t4) => !e3.hasOwnProperty(t4.key)) : new h.Keys();
            for (const r3 in e3) l.tryWithPath(() => t3.$_terms.keys.push({ key: r3, schema: this.$_compile(e3[r3]) }), r3);
          } else t3.$_terms.keys = new h.Keys();
          else t3.$_terms.keys = null;
          return t3.$_mutateRebuild();
        } }, length: { method(e3) {
          return this.$_addRule({ name: "length", args: { limit: e3 }, operator: "=" });
        }, validate: (e3, t3, { limit: r3 }, { name: s2, operator: n2, args: a2 }) => l.compare(Object.keys(e3).length, r3, n2) ? e3 : t3.error("object." + s2, { limit: a2.limit, value: e3 }), jsonSchema: (e3, t3) => (t3.minProperties = e3.args.limit, t3.maxProperties = e3.args.limit, t3), args: [{ name: "limit", ref: true, assert: l.limit, message: "must be a positive integer" }] }, max: { method(e3) {
          return this.$_addRule({ name: "max", method: "length", args: { limit: e3 }, operator: "<=" });
        }, jsonSchema: (e3, t3) => (t3.maxProperties = e3.args.limit, t3) }, min: { method(e3) {
          return this.$_addRule({ name: "min", method: "length", args: { limit: e3 }, operator: ">=" });
        }, jsonSchema: (e3, t3) => (t3.minProperties = e3.args.limit, t3) }, nand: { method(...e3) {
          return l.verifyFlat(e3, "nand"), h.dependency(this, "nand", null, e3);
        } }, or: { method(...e3) {
          return l.verifyFlat(e3, "or"), h.dependency(this, "or", null, e3);
        } }, oxor: { method(...e3) {
          return h.dependency(this, "oxor", null, e3);
        } }, pattern: { method(e3, t3, r3 = {}) {
          const s2 = e3 instanceof RegExp;
          s2 || (e3 = this.$_compile(e3, { appendPath: true })), n(void 0 !== t3, "Invalid rule"), l.assertOptions(r3, ["fallthrough", "matches"]), s2 && n(!e3.flags.includes("g") && !e3.flags.includes("y"), "pattern should not use global or sticky mode"), t3 = this.$_compile(t3, { appendPath: true });
          const a2 = this.clone();
          a2.$_terms.patterns = a2.$_terms.patterns || [];
          const i2 = { [s2 ? "regex" : "schema"]: e3, rule: t3 };
          return r3.matches && (i2.matches = this.$_compile(r3.matches), "array" !== i2.matches.type && (i2.matches = i2.matches.$_root.array().items(i2.matches)), a2.$_mutateRegister(i2.matches), a2.$_setFlag("_hasPatternMatch", true, { clone: false })), r3.fallthrough && (i2.fallthrough = true), a2.$_terms.patterns.push(i2), a2.$_mutateRegister(t3), a2;
        } }, ref: { method() {
          return this.$_addRule("ref");
        }, validate: (e3, t3) => f.isRef(e3) ? e3 : t3.error("object.refType", { value: e3 }) }, regex: { method() {
          return this.$_addRule("regex");
        }, validate: (e3, t3) => e3 instanceof RegExp ? e3 : t3.error("object.regex", { value: e3 }) }, rename: { method(e3, t3, r3 = {}) {
          n("string" == typeof e3 || e3 instanceof RegExp, "Rename missing the from argument"), n("string" == typeof t3 || t3 instanceof m, "Invalid rename to argument"), n(t3 !== e3, "Cannot rename key to same name:", e3), l.assertOptions(r3, ["alias", "ignoreUndefined", "override", "multiple"]);
          const a2 = this.clone();
          a2.$_terms.renames = a2.$_terms.renames || [];
          for (const t4 of a2.$_terms.renames) n(t4.from !== e3, "Cannot rename the same key multiple times");
          return t3 instanceof m && a2.$_mutateRegister(t3), a2.$_terms.renames.push({ from: e3, to: t3, options: s(h.renameDefaults, r3) }), a2;
        } }, schema: { method(e3 = "any") {
          return this.$_addRule({ name: "schema", args: { type: e3 } });
        }, validate: (e3, t3, { type: r3 }) => !l.isSchema(e3) || "any" !== r3 && e3.type !== r3 ? t3.error("object.schema", { type: r3 }) : e3 }, unknown: { method(e3) {
          return this.$_setFlag("unknown", false !== e3);
        } }, with: { method(e3, t3, r3 = {}) {
          return h.dependency(this, "with", e3, t3, r3);
        } }, without: { method(e3, t3, r3 = {}) {
          return h.dependency(this, "without", e3, t3, r3);
        } }, xor: { method(...e3) {
          return l.verifyFlat(e3, "xor"), h.dependency(this, "xor", null, e3);
        } } }, overrides: { default(e3, t3) {
          return void 0 === e3 && (e3 = l.symbols.deepDefault), this.$_parent("default", e3, t3);
        }, isAsync() {
          var e3, t3, r3;
          if (null !== (e3 = this.$_terms.externals) && void 0 !== e3 && e3.length) return true;
          if (null !== (t3 = this.$_terms.keys) && void 0 !== t3 && t3.length) {
            for (const e4 of this.$_terms.keys) if (e4.schema.isAsync()) return true;
          }
          if (null !== (r3 = this.$_terms.patterns) && void 0 !== r3 && r3.length) {
            for (const e4 of this.$_terms.patterns) if (e4.rule.isAsync()) return true;
          }
          return false;
        } }, rebuild(e3) {
          if (e3.$_terms.keys) {
            const t3 = new i.Sorter();
            for (const r3 of e3.$_terms.keys) l.tryWithPath(() => t3.add(r3, { after: r3.schema.$_rootReferences(), group: r3.key }), r3.key);
            e3.$_terms.keys = new h.Keys(...t3.nodes);
          }
        }, manifest: { build(e3, t3) {
          if (t3.keys && (e3 = e3.keys(t3.keys)), t3.dependencies) for (const { rel: r3, key: s2 = null, peers: n2, options: a2 } of t3.dependencies) e3 = h.dependency(e3, r3, s2, n2, a2);
          if (t3.patterns) for (const { regex: r3, schema: s2, rule: n2, fallthrough: a2, matches: i2 } of t3.patterns) e3 = e3.pattern(r3 || s2, n2, { fallthrough: a2, matches: i2 });
          if (t3.renames) for (const { from: r3, to: s2, options: n2 } of t3.renames) e3 = e3.rename(r3, s2, n2);
          return e3;
        } }, messages: { "object.and": "{{#label}} contains {{#presentWithLabels}} without its required peers {{#missingWithLabels}}", "object.assert": '{{#label}} is invalid because {if(#subject.key, `"` + #subject.key + `" failed to ` + (#message || "pass the assertion test"), #message || "the assertion failed")}', "object.base": "{{#label}} must be of type {{#type}}", "object.instance": "{{#label}} must be an instance of {{:#type}}", "object.length": '{{#label}} must have {{#limit}} key{if(#limit == 1, "", "s")}', "object.max": '{{#label}} must have less than or equal to {{#limit}} key{if(#limit == 1, "", "s")}', "object.min": '{{#label}} must have at least {{#limit}} key{if(#limit == 1, "", "s")}', "object.missing": "{{#label}} must contain at least one of {{#peersWithLabels}}", "object.nand": "{{:#mainWithLabel}} must not exist simultaneously with {{#peersWithLabels}}", "object.oxor": "{{#label}} contains a conflict between optional exclusive peers {{#peersWithLabels}}", "object.pattern.match": "{{#label}} keys failed to match pattern requirements", "object.refType": "{{#label}} must be a Joi reference", "object.regex": "{{#label}} must be a RegExp object", "object.rename.multiple": "{{#label}} cannot rename {{:#from}} because multiple renames are disabled and another key was already renamed to {{:#to}}", "object.rename.override": "{{#label}} cannot rename {{:#from}} because override is disabled and target {{:#to}} exists", "object.schema": "{{#label}} must be a Joi schema of {{#type}} type", "object.unknown": "{{#label}} is not allowed", "object.with": "{{:#mainWithLabel}} missing required peer {{:#peerWithLabel}}", "object.without": "{{:#mainWithLabel}} conflict with forbidden peer {{:#peerWithLabel}}", "object.xor": "{{#label}} contains a conflict between exclusive peers {{#peersWithLabels}}" } }), h.clone = function(e3, t3) {
          if ("object" == typeof e3) {
            if (t3.nonEnumerables) return a(e3, { shallow: true });
            const r4 = Object.create(Object.getPrototypeOf(e3));
            return Object.assign(r4, e3), r4;
          }
          const r3 = function(...t4) {
            return e3.apply(this, t4);
          };
          return r3.prototype = a(e3.prototype), Object.defineProperty(r3, "name", { value: e3.name, writable: false }), Object.defineProperty(r3, "length", { value: e3.length, writable: false }), Object.assign(r3, e3), r3;
        }, h.dependency = function(e3, t3, r3, s2, a2) {
          n(null === r3 || "string" == typeof r3, t3, "key must be a strings"), a2 || (a2 = s2.length > 1 && "object" == typeof s2[s2.length - 1] ? s2.pop() : {}), l.assertOptions(a2, ["separator", "isPresent"]), s2 = [].concat(s2);
          const i2 = l.default(a2.separator, "."), o2 = [];
          for (const e4 of s2) n("string" == typeof e4, t3, "peers must be strings"), o2.push(c.ref(e4, { separator: i2, ancestor: 0, prefix: false }));
          null !== r3 && (r3 = c.ref(r3, { separator: i2, ancestor: 0, prefix: false }));
          const u2 = e3.clone();
          return u2.$_terms.dependencies = u2.$_terms.dependencies || [], u2.$_terms.dependencies.push(new h.Dependency(t3, r3, o2, s2, a2)), u2;
        }, h.dependencies = { and(e3, t3, r3, s2, n2) {
          const a2 = [], i2 = [], o2 = t3.peers.length, l2 = h.isPresent(t3.options);
          for (const e4 of t3.peers) false === l2(e4.resolve(r3, s2, n2, null, { shadow: false })) ? a2.push(e4.key) : i2.push(e4.key);
          if (a2.length !== o2 && i2.length !== o2) return { code: "object.and", context: { present: i2, presentWithLabels: h.keysToLabels(e3, i2), missing: a2, missingWithLabels: h.keysToLabels(e3, a2) } };
        }, nand(e3, t3, r3, s2, n2) {
          const a2 = [], i2 = h.isPresent(t3.options);
          for (const e4 of t3.peers) i2(e4.resolve(r3, s2, n2, null, { shadow: false })) && a2.push(e4.key);
          if (a2.length !== t3.peers.length) return;
          const o2 = t3.paths[0], l2 = t3.paths.slice(1);
          return { code: "object.nand", context: { main: o2, mainWithLabel: h.keysToLabels(e3, o2), peers: l2, peersWithLabels: h.keysToLabels(e3, l2) } };
        }, or(e3, t3, r3, s2, n2) {
          const a2 = h.isPresent(t3.options);
          for (const e4 of t3.peers) if (a2(e4.resolve(r3, s2, n2, null, { shadow: false }))) return;
          return { code: "object.missing", context: { peers: t3.paths, peersWithLabels: h.keysToLabels(e3, t3.paths) } };
        }, oxor(e3, t3, r3, s2, n2) {
          const a2 = [], i2 = h.isPresent(t3.options);
          for (const e4 of t3.peers) i2(e4.resolve(r3, s2, n2, null, { shadow: false })) && a2.push(e4.key);
          if (!a2.length || 1 === a2.length) return;
          const o2 = { peers: t3.paths, peersWithLabels: h.keysToLabels(e3, t3.paths) };
          return o2.present = a2, o2.presentWithLabels = h.keysToLabels(e3, a2), { code: "object.oxor", context: o2 };
        }, with(e3, t3, r3, s2, n2) {
          const a2 = h.isPresent(t3.options);
          for (const i2 of t3.peers) if (false === a2(i2.resolve(r3, s2, n2, null, { shadow: false }))) return { code: "object.with", context: { main: t3.key.key, mainWithLabel: h.keysToLabels(e3, t3.key.key), peer: i2.key, peerWithLabel: h.keysToLabels(e3, i2.key) } };
        }, without(e3, t3, r3, s2, n2) {
          const a2 = h.isPresent(t3.options);
          for (const i2 of t3.peers) if (a2(i2.resolve(r3, s2, n2, null, { shadow: false }))) return { code: "object.without", context: { main: t3.key.key, mainWithLabel: h.keysToLabels(e3, t3.key.key), peer: i2.key, peerWithLabel: h.keysToLabels(e3, i2.key) } };
        }, xor(e3, t3, r3, s2, n2) {
          const a2 = [], i2 = h.isPresent(t3.options);
          for (const e4 of t3.peers) i2(e4.resolve(r3, s2, n2, null, { shadow: false })) && a2.push(e4.key);
          if (1 === a2.length) return;
          const o2 = { peers: t3.paths, peersWithLabels: h.keysToLabels(e3, t3.paths) };
          return 0 === a2.length ? { code: "object.missing", context: o2 } : (o2.present = a2, o2.presentWithLabels = h.keysToLabels(e3, a2), { code: "object.xor", context: o2 });
        } }, h.keysToLabels = function(e3, t3) {
          return Array.isArray(t3) ? t3.map((t4) => e3.$_mapLabels(t4)) : e3.$_mapLabels(t3);
        }, h.isPresent = function(e3) {
          return "function" == typeof e3.isPresent ? e3.isPresent : (e4) => void 0 !== e4;
        }, h.rename = function(e3, t3, r3, s2, n2) {
          const a2 = {};
          for (const i2 of e3.$_terms.renames) {
            const o2 = [], l2 = "string" != typeof i2.from;
            if (l2) for (const e4 in t3) {
              if (void 0 === t3[e4] && i2.options.ignoreUndefined) continue;
              if (e4 === i2.to) continue;
              const r4 = i2.from.exec(e4);
              r4 && o2.push({ from: e4, to: i2.to, match: r4 });
            }
            else !Object.prototype.hasOwnProperty.call(t3, i2.from) || void 0 === t3[i2.from] && i2.options.ignoreUndefined || o2.push(i2);
            for (const c2 of o2) {
              const o3 = c2.from;
              let u2 = c2.to;
              if (u2 instanceof m && (u2 = u2.render(t3, r3, s2, c2.match)), o3 !== u2) {
                if (!i2.options.multiple && a2[u2] && (n2.push(e3.$_createError("object.rename.multiple", t3, { from: o3, to: u2, pattern: l2 }, r3, s2)), s2.abortEarly)) return false;
                if (Object.prototype.hasOwnProperty.call(t3, u2) && !i2.options.override && !a2[u2] && (n2.push(e3.$_createError("object.rename.override", t3, { from: o3, to: u2, pattern: l2 }, r3, s2)), s2.abortEarly)) return false;
                void 0 === t3[o3] ? delete t3[u2] : t3[u2] = t3[o3], a2[u2] = true, i2.options.alias || delete t3[o3];
              }
            }
          }
          return true;
        }, h.unknown = function(e3, t3, r3, s2, n2, a2) {
          if (e3.$_terms.patterns) {
            let i2 = false;
            const o2 = e3.$_terms.patterns.map((e4) => {
              if (e4.matches) return i2 = true, [];
            }), l2 = [t3, ...n2.ancestors];
            for (const i3 of r3) {
              const c2 = t3[i3], u2 = [...n2.path, i3];
              for (let f2 = 0; f2 < e3.$_terms.patterns.length; ++f2) {
                const m2 = e3.$_terms.patterns[f2];
                if (m2.regex) {
                  const e4 = m2.regex.test(i3);
                  if (n2.mainstay.tracer.debug(n2, "rule", `pattern.${f2}`, e4 ? "pass" : "error"), !e4) continue;
                } else if (!m2.schema.$_match(i3, n2.nest(m2.schema, `pattern.${f2}`), a2)) continue;
                r3.delete(i3);
                const h2 = n2.localize(u2, l2, { schema: m2.rule, key: i3 }), p = m2.rule.$_validate(c2, h2, a2);
                if (p.errors) {
                  if (a2.abortEarly) return { value: t3, errors: p.errors };
                  s2.push(...p.errors);
                }
                if (m2.matches && o2[f2].push(i3), t3[i3] = p.value, !m2.fallthrough) break;
              }
            }
            if (i2) for (let r4 = 0; r4 < o2.length; ++r4) {
              const i3 = o2[r4];
              if (!i3) continue;
              const c2 = e3.$_terms.patterns[r4].matches, f2 = n2.localize(n2.path, l2, c2), m2 = c2.$_validate(i3, f2, a2);
              if (m2.errors) {
                const r5 = u.details(m2.errors, { override: false });
                r5.matches = i3;
                const o3 = e3.$_createError("object.pattern.match", t3, r5, n2, a2);
                if (a2.abortEarly) return { value: t3, errors: o3 };
                s2.push(o3);
              }
            }
          }
          if (r3.size && (e3.$_terms.keys || e3.$_terms.patterns)) {
            if (a2.stripUnknown && void 0 === e3._flags.unknown || a2.skipFunctions) {
              const e4 = !(!a2.stripUnknown || true !== a2.stripUnknown && !a2.stripUnknown.objects);
              for (const s3 of r3) e4 ? (delete t3[s3], r3.delete(s3)) : "function" == typeof t3[s3] && r3.delete(s3);
            }
            if (!l.default(e3._flags.unknown, a2.allowUnknown)) for (const i2 of r3) {
              const r4 = n2.localize([...n2.path, i2], []), o2 = e3.$_createError("object.unknown", t3[i2], { child: i2 }, r4, a2, { flags: false });
              if (a2.abortEarly) return { value: t3, errors: o2 };
              s2.push(o2);
            }
          }
        }, h.Dependency = class {
          constructor(e3, t3, r3, s2, n2) {
            this.rel = e3, this.key = t3, this.peers = r3, this.paths = s2, this.options = n2;
          }
          describe() {
            const e3 = { rel: this.rel, peers: this.paths };
            return null !== this.key && (e3.key = this.key.key), "." !== this.peers[0].separator && (e3.options = { ...e3.options, separator: this.peers[0].separator }), this.options.isPresent && (e3.options = { ...e3.options, isPresent: this.options.isPresent }), e3;
          }
        }, h.Keys = class extends Array {
          concat(e3) {
            const t3 = this.slice(), r3 = /* @__PURE__ */ new Map();
            for (let e4 = 0; e4 < t3.length; ++e4) r3.set(t3[e4].key, e4);
            for (const s2 of e3) {
              const e4 = s2.key, n2 = r3.get(e4);
              void 0 !== n2 ? t3[n2] = { key: e4, schema: t3[n2].schema.concat(s2.schema) } : t3.push(s2);
            }
            return t3;
          }
        };
      }, 9556(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(680), a = r2(9415), i = r2(3541), o = r2(8013), l = {};
        e2.exports = n.extend({ type: "link", properties: { schemaChain: true }, terms: { link: { init: null, manifest: "single", register: false } }, args: (e3, t3) => e3.ref(t3), jsonSchema(e3, t3, r3, s2) {
          if (!e3.$_terms.link) return t3;
          const { ref: n2 } = e3.$_terms.link[0];
          return "root" === n2.ancestor || n2.ancestor > 0 ? (t3.$ref = `#/${n2.path.map((e4) => `properties/${e4}`).join("/")}`, t3) : (1 === n2.path.length ? t3.$ref = `#/$defs/${n2.path[0]}` : t3.$ref = `#/${n2.path.slice(1).map((e4) => `properties/${e4}`).join("/")}`, t3);
        }, validate(e3, { schema: t3, state: r3, prefs: n2, error: a2 }) {
          s(t3.$_terms.link, "Uninitialized link schema");
          const i2 = t3._flags.maxRecursion;
          if (void 0 !== i2 && r3.schemas.filter((e4) => e4.schema === t3).length > i2) return { value: e3, errors: a2("link.maxRecursion", { limit: i2 }) };
          const o2 = l.generate(t3, e3, r3, n2), c = t3.$_terms.link[0].ref;
          try {
            return o2.$_validate(e3, r3.nest(o2, `link:${c.display}:${o2.type}`), n2);
          } catch (t4) {
            if (!(t4 instanceof RangeError)) throw t4;
            return { value: e3, errors: a2("link.depth") };
          }
        }, generate: (e3, t3, r3, s2) => l.generate(e3, t3, r3, s2), rules: { ref: { method(e3) {
          s(!this.$_terms.link, "Cannot reinitialize schema"), e3 = i.ref(e3), s("value" === e3.type || "local" === e3.type, "Invalid reference type:", e3.type), s("local" === e3.type || "root" === e3.ancestor || e3.ancestor > 0, "Link cannot reference itself");
          const t3 = this.clone();
          return t3.$_terms.link = [{ ref: e3 }], t3;
        } }, relative: { method(e3 = true) {
          return this.$_setFlag("relative", e3);
        } }, maxRecursion: { method(e3) {
          return s(Number.isSafeInteger(e3) && e3 >= 1, "limit must be a positive integer"), this.$_setFlag("maxRecursion", e3);
        } } }, messages: { "link.depth": "{{#label}} exceeds maximum recursion depth supported by the runtime", "link.maxRecursion": "{{#label}} exceeds maximum recursion depth of {{#limit}}" }, overrides: { concat(e3) {
          s(this.$_terms.link, "Uninitialized link schema"), s(a.isSchema(e3), "Invalid schema object"), s("link" !== e3.type, "Cannot merge type link with another link");
          const t3 = this.clone();
          return t3.$_terms.whens || (t3.$_terms.whens = []), t3.$_terms.whens.push({ concat: e3 }), t3.$_mutateRebuild();
        } }, manifest: { build: (e3, t3) => (s(t3.link, "Invalid link description missing link"), e3.ref(t3.link)) } }), l.generate = function(e3, t3, r3, s2) {
          let n2 = r3.mainstay.links.get(e3);
          if (n2) return n2._generate(t3, r3, s2).schema;
          const a2 = e3.$_terms.link[0].ref, { perspective: i2, path: o2 } = l.perspective(a2, r3);
          l.assert(i2, "which is outside of schema boundaries", a2, e3, r3, s2);
          try {
            n2 = o2.length ? i2.$_reach(o2) : i2;
          } catch {
            l.assert(false, "to non-existing schema", a2, e3, r3, s2);
          }
          return l.assert("link" !== n2.type, "which is another link", a2, e3, r3, s2), e3._flags.relative || r3.mainstay.links.set(e3, n2), n2._generate(t3, r3, s2).schema;
        }, l.perspective = function(e3, t3) {
          if ("local" === e3.type) {
            for (const { schema: r3, key: s2 } of t3.schemas) {
              if ((r3._flags.id || s2) === e3.path[0]) return { perspective: r3, path: e3.path.slice(1) };
              if (r3.$_terms.shared) {
                for (const t4 of r3.$_terms.shared) if (t4._flags.id === e3.path[0]) return { perspective: t4, path: e3.path.slice(1) };
              }
            }
            return { perspective: null, path: null };
          }
          return "root" === e3.ancestor ? { perspective: t3.schemas[t3.schemas.length - 1].schema, path: e3.path } : { perspective: t3.schemas[e3.ancestor] && t3.schemas[e3.ancestor].schema, path: e3.path };
        }, l.assert = function(e3, t3, r3, n2, a2, i2) {
          e3 || s(false, `"${o.label(n2._flags, a2, i2)}" contains link reference "${r3.display}" ${t3}`);
        };
      }, 4709(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(680), a = r2(9415), i = { numberRx: /^\s*[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e([+-]?\d+))?\s*$/i, precisionRx: /(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/, exponentialPartRegex: /[eE][+-]?\d+$/, leadingSignAndZerosRegex: /^[+-]?(0*)?/, dotRegex: /\./, trailingZerosRegex: /0+$/, decimalPlaces(e3) {
          const t3 = e3.toString(), r3 = t3.indexOf("."), s2 = t3.indexOf("e");
          return (r3 < 0 ? 0 : (s2 < 0 ? t3.length : s2) - r3 - 1) + (s2 < 0 ? 0 : Math.max(0, -parseInt(t3.slice(s2 + 1))));
        } };
        e2.exports = n.extend({ type: "number", flags: { unsafe: { default: false } }, coerce: { from: "string", method(e3, { schema: t3, error: r3 }) {
          if (!e3.match(i.numberRx)) return;
          e3 = e3.trim();
          const s2 = { value: parseFloat(e3) };
          if (0 === s2.value && (s2.value = 0), !t3._flags.unsafe) if (e3.match(/e/i)) {
            if (i.extractSignificantDigits(e3) !== i.extractSignificantDigits(String(s2.value))) return s2.errors = r3("number.unsafe"), s2;
          } else {
            const t4 = s2.value.toString();
            if (t4.match(/e/i)) return s2;
            if (t4 !== i.normalizeDecimal(e3)) return s2.errors = r3("number.unsafe"), s2;
          }
          return s2;
        } }, validate(e3, { schema: t3, error: r3, prefs: s2 }) {
          if (e3 === 1 / 0 || e3 === -1 / 0) return { value: e3, errors: r3("number.infinity") };
          if (!a.isNumber(e3)) return { value: e3, errors: r3("number.base") };
          const n2 = { value: e3 };
          if (s2.convert) {
            const e4 = t3.$_getRule("precision");
            if (e4) {
              const t4 = Math.pow(10, e4.args.limit);
              n2.value = Math.round(n2.value * t4) / t4;
            }
          }
          return 0 === n2.value && (n2.value = 0), !t3._flags.unsafe && (e3 > Number.MAX_SAFE_INTEGER || e3 < Number.MIN_SAFE_INTEGER) && (n2.errors = r3("number.unsafe")), n2;
        }, rules: { compare: { method: false, validate: (e3, t3, { limit: r3 }, { name: s2, operator: n2, args: i2 }) => a.compare(e3, r3, n2) ? e3 : t3.error("number." + s2, { limit: i2.limit, value: e3 }), args: [{ name: "limit", ref: true, assert: a.isNumber, message: "must be a number" }] }, greater: { method(e3) {
          return this.$_addRule({ name: "greater", method: "compare", args: { limit: e3 }, operator: ">" });
        }, jsonSchema: (e3, t3) => (t3.exclusiveMinimum = e3.args.limit, t3) }, integer: { method() {
          return this.$_addRule("integer");
        }, validate: (e3, t3) => Math.trunc(e3) - e3 === 0 ? e3 : t3.error("number.integer"), jsonSchema: (e3, t3) => (t3.type = "integer", t3) }, less: { method(e3) {
          return this.$_addRule({ name: "less", method: "compare", args: { limit: e3 }, operator: "<" });
        }, jsonSchema: (e3, t3) => (t3.exclusiveMaximum = e3.args.limit, t3) }, max: { method(e3) {
          return this.$_addRule({ name: "max", method: "compare", args: { limit: e3 }, operator: "<=" });
        }, jsonSchema: (e3, t3) => (t3.maximum = e3.args.limit, t3) }, min: { method(e3) {
          return this.$_addRule({ name: "min", method: "compare", args: { limit: e3 }, operator: ">=" });
        }, jsonSchema: (e3, t3) => (t3.minimum = e3.args.limit, t3) }, multiple: { method(e3) {
          const t3 = "number" == typeof e3 ? i.decimalPlaces(e3) : null, r3 = Math.pow(10, t3);
          return this.$_addRule({ name: "multiple", args: { base: e3, baseDecimalPlace: t3, pfactor: r3 } });
        }, validate: (e3, t3, { base: r3, baseDecimalPlace: s2, pfactor: n2 }, a2) => i.decimalPlaces(e3) > s2 ? t3.error("number.multiple", { multiple: a2.args.base, value: e3 }) : Math.round(n2 * e3) % Math.round(n2 * r3) === 0 ? e3 : t3.error("number.multiple", { multiple: a2.args.base, value: e3 }), jsonSchema: (e3, t3) => (t3.multipleOf = e3.args.base, t3), args: [{ name: "base", ref: true, assert: (e3) => "number" == typeof e3 && isFinite(e3) && e3 > 0, message: "must be a positive number" }, "baseDecimalPlace", "pfactor"], multi: true }, negative: { method() {
          return this.sign("negative");
        } }, port: { method() {
          return this.$_addRule("port");
        }, validate: (e3, t3) => Number.isSafeInteger(e3) && e3 >= 0 && e3 <= 65535 ? e3 : t3.error("number.port"), jsonSchema: (e3, t3) => (t3.type = "integer", t3.minimum = 0, t3.maximum = 65535, t3) }, positive: { method() {
          return this.sign("positive");
        } }, precision: { method(e3) {
          return s(Number.isSafeInteger(e3), "limit must be an integer"), this.$_addRule({ name: "precision", args: { limit: e3 } });
        }, validate(e3, t3, { limit: r3 }) {
          const s2 = e3.toString().match(i.precisionRx);
          return Math.max((s2[1] ? s2[1].length : 0) - (s2[2] ? parseInt(s2[2], 10) : 0), 0) <= r3 ? e3 : t3.error("number.precision", { limit: r3, value: e3 });
        }, convert: true }, sign: { method(e3) {
          return s(["negative", "positive"].includes(e3), "Invalid sign", e3), this.$_addRule({ name: "sign", args: { sign: e3 } });
        }, validate: (e3, t3, { sign: r3 }) => "negative" === r3 && e3 < 0 || "positive" === r3 && e3 > 0 ? e3 : t3.error(`number.${r3}`), jsonSchema: (e3, t3) => ("positive" === e3.args.sign ? t3.exclusiveMinimum = 0 : t3.exclusiveMaximum = 0, t3) }, unsafe: { method(e3 = true) {
          return s("boolean" == typeof e3, "enabled must be a boolean"), this.$_setFlag("unsafe", e3);
        } } }, cast: { string: { from: (e3) => "number" == typeof e3, to: (e3, t3) => e3.toString() } }, messages: { "number.base": "{{#label}} must be a number", "number.greater": "{{#label}} must be greater than {{#limit}}", "number.infinity": "{{#label}} cannot be infinity", "number.integer": "{{#label}} must be an integer", "number.less": "{{#label}} must be less than {{#limit}}", "number.max": "{{#label}} must be less than or equal to {{#limit}}", "number.min": "{{#label}} must be greater than or equal to {{#limit}}", "number.multiple": "{{#label}} must be a multiple of {{#multiple}}", "number.negative": "{{#label}} must be a negative number", "number.port": "{{#label}} must be a valid port", "number.positive": "{{#label}} must be a positive number", "number.precision": "{{#label}} must have no more than {{#limit}} decimal places", "number.unsafe": "{{#label}} must be a safe number" } }), i.extractSignificantDigits = function(e3) {
          return e3.replace(i.exponentialPartRegex, "").replace(i.dotRegex, "").replace(i.trailingZerosRegex, "").replace(i.leadingSignAndZerosRegex, "");
        }, i.normalizeDecimal = function(e3) {
          return (e3 = e3.replace(/^\+/, "").replace(/\.0*$/, "").replace(/^(-?)\.([^\.]*)$/, "$10.$2").replace(/^(-?)0+([0-9])/, "$1$2")).includes(".") && e3.endsWith("0") && (e3 = e3.replace(/0+$/, "")), "-0" === e3 ? "0" : e3;
        };
      }, 7487(e2, t2, r2) {
        "use strict";
        const s = r2(2888);
        e2.exports = s.extend({ type: "object", cast: { map: { from: (e3) => e3 && "object" == typeof e3, to: (e3, t3) => new Map(Object.entries(e3)) } } });
      }, 9033(e2, t2, r2) {
        "use strict";
        const { assert: s, escapeRegex: n } = r2(3115), { isDomainValid: a, isEmailValid: i, ipRegex: o, uriRegex: l } = r2(9089), c = r2(1339), u = r2(680), f = r2(9415), m = { tlds: c.tlds instanceof Set && { tlds: { allow: c.tlds, deny: null } }, base64Regex: { true: { true: /^(?:[\w\-]{2}[\w\-]{2})*(?:[\w\-]{2}==|[\w\-]{3}=)?$/, false: /^(?:[A-Za-z0-9+\/]{2}[A-Za-z0-9+\/]{2})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/ }, false: { true: /^(?:[\w\-]{2}[\w\-]{2})*(?:[\w\-]{2}(==)?|[\w\-]{3}=?)?$/, false: /^(?:[A-Za-z0-9+\/]{2}[A-Za-z0-9+\/]{2})*(?:[A-Za-z0-9+\/]{2}(==)?|[A-Za-z0-9+\/]{3}=?)?$/ } }, dataUriRegex: /^data:[\w+.-]+\/[\w+.-]+;((charset=[\w-]+|base64),)?(.*)$/, hexRegex: { withPrefix: /^0x[0-9a-f]+$/i, withOptionalPrefix: /^(?:0x)?[0-9a-f]+$/i, withoutPrefix: /^[0-9a-f]+$/i }, ipRegex: o({ cidr: "forbidden" }).regex, isoDurationRegex: /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/, guidBrackets: { "{": "}", "[": "]", "(": ")", "": "" }, guidVersions: { uuidv1: "1", uuidv2: "2", uuidv3: "3", uuidv4: "4", uuidv5: "5", uuidv6: "6", uuidv7: "7", uuidv8: "8" }, guidSeparators: /* @__PURE__ */ new Set([void 0, true, false, "-", ":"]), normalizationForms: ["NFC", "NFD", "NFKC", "NFKD"] };
        e2.exports = u.extend({ type: "string", flags: { insensitive: { default: false }, truncate: { default: false } }, terms: { replacements: { init: null } }, coerce: { from: "string", method(e3, { schema: t3, state: r3, prefs: s2 }) {
          const n2 = t3.$_getRule("normalize");
          n2 && (e3 = e3.normalize(n2.args.form));
          const a2 = t3.$_getRule("case");
          a2 && (e3 = "upper" === a2.args.direction ? e3.toLocaleUpperCase() : e3.toLocaleLowerCase());
          const i2 = t3.$_getRule("trim");
          if (i2 && i2.args.enabled && (e3 = e3.trim()), t3.$_terms.replacements) for (const r4 of t3.$_terms.replacements) e3 = e3.replace(r4.pattern, r4.replacement);
          const o2 = t3.$_getRule("hex");
          if (o2 && o2.args.options.byteAligned && e3.length % 2 != 0 && (e3 = `0${e3}`), t3.$_getRule("isoDate")) {
            const t4 = m.isoDate(e3);
            t4 && (e3 = t4);
          }
          if (t3._flags.truncate) {
            const n3 = t3.$_getRule("max");
            if (n3) {
              let a3 = n3.args.limit;
              if (f.isResolvable(a3) && (a3 = a3.resolve(e3, r3, s2), !f.limit(a3))) return { value: e3, errors: t3.$_createError("any.ref", a3, { ref: n3.args.limit, arg: "limit", reason: "must be a positive integer" }, r3, s2) };
              e3 = e3.slice(0, a3);
            }
          }
          return { value: e3 };
        } }, validate(e3, { schema: t3, error: r3 }) {
          if ("string" != typeof e3) return { value: e3, errors: r3("string.base") };
          if ("" === e3) {
            const s2 = t3.$_getRule("min");
            if (s2 && 0 === s2.args.limit) return;
            return { value: e3, errors: r3("string.empty") };
          }
        }, jsonSchema(e3, t3, r3, s2) {
          var n2;
          if (!(null !== (n2 = e3._valids) && void 0 !== n2 && n2.has("") || e3._flags.only)) {
            const r4 = e3.$_getRule("min"), s3 = e3.$_getRule("length");
            (!r4 || r4.args.limit > 0) && (!s3 || s3.args.limit > 0) && (t3.minLength = 1);
          }
          return t3;
        }, rules: { alphanum: { method() {
          return this.$_addRule("alphanum");
        }, validate: (e3, t3) => /^[a-zA-Z0-9]+$/.test(e3) ? e3 : t3.error("string.alphanum") }, base64: { method(e3 = {}) {
          return f.assertOptions(e3, ["paddingRequired", "urlSafe"]), e3 = { urlSafe: false, paddingRequired: true, ...e3 }, s("boolean" == typeof e3.paddingRequired, "paddingRequired must be boolean"), s("boolean" == typeof e3.urlSafe, "urlSafe must be boolean"), this.$_addRule({ name: "base64", args: { options: e3 } });
        }, validate: (e3, t3, { options: r3 }) => m.base64Regex[r3.paddingRequired][r3.urlSafe].test(e3) ? e3 : t3.error("string.base64"), jsonSchema: (e3, t3) => (t3.format = "base64", t3) }, case: { method(e3) {
          return s(["lower", "upper"].includes(e3), "Invalid case:", e3), this.$_addRule({ name: "case", args: { direction: e3 } });
        }, validate: (e3, t3, { direction: r3 }) => "lower" === r3 && e3 === e3.toLocaleLowerCase() || "upper" === r3 && e3 === e3.toLocaleUpperCase() ? e3 : t3.error(`string.${r3}case`), convert: true }, creditCard: { method() {
          return this.$_addRule("creditCard");
        }, validate(e3, t3) {
          let r3 = e3.length, s2 = 0, n2 = 1;
          for (; r3--; ) {
            const t4 = e3.charAt(r3) * n2;
            s2 += t4 - 9 * (t4 > 9), n2 ^= 3;
          }
          return s2 > 0 && s2 % 10 == 0 ? e3 : t3.error("string.creditCard");
        } }, dataUri: { method(e3 = {}) {
          return f.assertOptions(e3, ["paddingRequired"]), e3 = { paddingRequired: true, ...e3 }, s("boolean" == typeof e3.paddingRequired, "paddingRequired must be boolean"), this.$_addRule({ name: "dataUri", args: { options: e3 } });
        }, validate(e3, t3, { options: r3 }) {
          const s2 = e3.match(m.dataUriRegex);
          if (s2) {
            if (!s2[2]) return e3;
            if ("base64" !== s2[2]) return e3;
            if (m.base64Regex[r3.paddingRequired].false.test(s2[3])) return e3;
          }
          return t3.error("string.dataUri");
        }, jsonSchema: (e3, t3) => (t3.format = "data-uri", t3) }, domain: { method(e3) {
          e3 && f.assertOptions(e3, ["allowFullyQualified", "allowUnicode", "allowUnderscore", "maxDomainSegments", "minDomainSegments", "tlds"]);
          const t3 = m.addressOptions(e3);
          return this.$_addRule({ name: "domain", args: { options: e3 }, address: t3 });
        }, validate: (e3, t3, r3, { address: s2 }) => a(e3, s2) ? e3 : t3.error("string.domain") }, email: { method(e3 = {}) {
          f.assertOptions(e3, ["allowFullyQualified", "allowUnicode", "ignoreLength", "maxDomainSegments", "minDomainSegments", "multiple", "separator", "tlds"]), s(void 0 === e3.multiple || "boolean" == typeof e3.multiple, "multiple option must be an boolean");
          const t3 = m.addressOptions(e3), r3 = new RegExp(`\\s*[${e3.separator ? n(e3.separator) : ","}]\\s*`);
          return this.$_addRule({ name: "email", args: { options: e3 }, regex: r3, address: t3 });
        }, validate(e3, t3, { options: r3 }, { regex: s2, address: n2 }) {
          const a2 = r3.multiple ? e3.split(s2) : [e3], o2 = [];
          for (const e4 of a2) i(e4, n2) || o2.push(e4);
          return o2.length ? t3.error("string.email", { value: e3, invalids: o2 }) : e3;
        }, jsonSchema: (e3, t3) => (t3.format = "email", t3) }, guid: { alias: "uuid", method(e3 = {}) {
          f.assertOptions(e3, ["version", "separator", "wrapper"]), s(void 0 === e3.wrapper || "boolean" == typeof e3.wrapper || "string" == typeof e3.wrapper && "string" == typeof m.guidBrackets[e3.wrapper], `"wrapper" must be true, false, or one of "${Object.keys(m.guidBrackets).filter(Boolean).join('", "')}"`);
          let t3 = "";
          if (e3.version) {
            const r4 = [].concat(e3.version);
            s(r4.length >= 1, "version must have at least 1 valid version specified");
            const n2 = /* @__PURE__ */ new Set();
            for (let e4 = 0; e4 < r4.length; ++e4) {
              const a3 = r4[e4];
              s("string" == typeof a3, "version at position " + e4 + " must be a string");
              const i3 = m.guidVersions[a3.toLowerCase()];
              s(i3, "version at position " + e4 + " must be one of " + Object.keys(m.guidVersions).join(", ")), s(!n2.has(i3), "version at position " + e4 + " must not be a duplicate"), t3 += i3, n2.add(i3);
            }
          }
          s(m.guidSeparators.has(e3.separator), 'separator must be one of true, false, "-", or ":"');
          const r3 = void 0 === e3.separator ? "[:-]?" : true === e3.separator ? "[:-]" : false === e3.separator ? "[]?" : `\\${e3.separator}`;
          let a2, i2;
          void 0 === e3.wrapper ? (a2 = "[\\[{\\(]?", i2 = "[\\]}\\)]?") : true === e3.wrapper ? (a2 = "[\\[{\\(]", i2 = "[\\]}\\)]") : false === e3.wrapper ? (a2 = "", i2 = "") : (a2 = n(e3.wrapper), i2 = n(m.guidBrackets[e3.wrapper]));
          const o2 = new RegExp(`^(${a2})[0-9A-F]{8}(${r3})[0-9A-F]{4}\\2?[${t3 || "0-9A-F"}][0-9A-F]{3}\\2?[${t3 ? "89AB" : "0-9A-F"}][0-9A-F]{3}\\2?[0-9A-F]{12}(${i2})$`, "i");
          return this.$_addRule({ name: "guid", args: { options: e3 }, regex: o2 });
        }, validate(e3, t3, r3, { regex: s2 }) {
          const n2 = s2.exec(e3);
          if (!n2) return t3.error("string.guid");
          const a2 = n2[1], i2 = n2[n2.length - 1];
          return (a2 || i2) && m.guidBrackets[a2] !== i2 ? t3.error("string.guid") : e3;
        }, jsonSchema: (e3, t3) => (t3.format = "uuid", t3) }, hex: { method(e3 = {}) {
          return f.assertOptions(e3, ["byteAligned", "prefix"]), e3 = { byteAligned: false, prefix: false, ...e3 }, s("boolean" == typeof e3.byteAligned, "byteAligned must be boolean"), s("boolean" == typeof e3.prefix || "optional" === e3.prefix, 'prefix must be boolean or "optional"'), this.$_addRule({ name: "hex", args: { options: e3 } });
        }, validate: (e3, t3, { options: r3 }) => ("optional" === r3.prefix ? m.hexRegex.withOptionalPrefix : true === r3.prefix ? m.hexRegex.withPrefix : m.hexRegex.withoutPrefix).test(e3) ? r3.byteAligned && e3.length % 2 != 0 ? t3.error("string.hexAlign") : e3 : t3.error("string.hex"), jsonSchema: (e3, t3) => (t3.format = "hex", t3) }, hostname: { method() {
          return this.$_addRule("hostname");
        }, validate: (e3, t3) => a(e3, { minDomainSegments: 1 }) || m.ipRegex.test(e3) ? e3 : t3.error("string.hostname"), jsonSchema: (e3, t3) => (t3.format = "hostname", t3) }, insensitive: { method() {
          return this.$_setFlag("insensitive", true);
        } }, ip: { method(e3 = {}) {
          f.assertOptions(e3, ["cidr", "version"]);
          const { cidr: t3, versions: r3, regex: s2 } = o(e3), n2 = e3.version ? r3 : void 0;
          return this.$_addRule({ name: "ip", args: { options: { cidr: t3, version: n2 } }, regex: s2 });
        }, validate: (e3, t3, { options: r3 }, { regex: s2 }) => s2.test(e3) ? e3 : r3.version ? t3.error("string.ipVersion", { value: e3, cidr: r3.cidr, version: r3.version }) : t3.error("string.ip", { value: e3, cidr: r3.cidr }), jsonSchema(e3, t3) {
          const r3 = e3.args.options.version;
          return r3 && 1 === r3.length ? t3.format = r3[0] : t3.format = "ip", t3;
        } }, isoDate: { method() {
          return this.$_addRule("isoDate");
        }, validate: (e3, { error: t3 }) => m.isoDate(e3) ? e3 : t3("string.isoDate"), jsonSchema: (e3, t3) => (t3.format = "date-time", t3) }, isoDuration: { method() {
          return this.$_addRule("isoDuration");
        }, validate: (e3, t3) => m.isoDurationRegex.test(e3) ? e3 : t3.error("string.isoDuration"), jsonSchema: (e3, t3) => (t3.format = "duration", t3) }, length: { method(e3, t3) {
          return m.length(this, "length", e3, "=", t3);
        }, validate(e3, t3, { limit: r3, encoding: s2 }, { name: n2, operator: a2, args: i2 }) {
          const o2 = !s2 && e3.length;
          return f.compare(o2, r3, a2) ? e3 : t3.error("string." + n2, { limit: i2.limit, value: e3, encoding: s2 });
        }, jsonSchema: (e3, t3) => (t3.minLength = e3.args.limit, t3.maxLength = e3.args.limit, t3), args: [{ name: "limit", ref: true, assert: f.limit, message: "must be a positive integer" }, "encoding"] }, lowercase: { method() {
          return this.case("lower");
        } }, max: { method(e3, t3) {
          return m.length(this, "max", e3, "<=", t3);
        }, jsonSchema: (e3, t3) => (t3.maxLength = e3.args.limit, t3), args: ["limit", "encoding"] }, min: { method(e3, t3) {
          return m.length(this, "min", e3, ">=", t3);
        }, jsonSchema: (e3, t3) => (e3.args.limit > 0 && (t3.minLength = e3.args.limit), t3), args: ["limit", "encoding"] }, normalize: { method(e3 = "NFC") {
          return s(m.normalizationForms.includes(e3), "normalization form must be one of " + m.normalizationForms.join(", ")), this.$_addRule({ name: "normalize", args: { form: e3 } });
        }, validate: (e3, { error: t3 }, { form: r3 }) => e3 === e3.normalize(r3) ? e3 : t3("string.normalize", { value: e3, form: r3 }), convert: true }, pattern: { alias: "regex", method(e3, t3 = {}) {
          s(e3 instanceof RegExp, "regex must be a RegExp"), s(!e3.flags.includes("g") && !e3.flags.includes("y"), "regex should not use global or sticky mode"), "string" == typeof t3 && (t3 = { name: t3 }), f.assertOptions(t3, ["invert", "name"]);
          const r3 = ["string.pattern", t3.invert ? ".invert" : "", t3.name ? ".name" : ".base"].join("");
          return this.$_addRule({ name: "pattern", args: { regex: e3, options: t3 }, errorCode: r3 });
        }, validate: (e3, t3, { regex: r3, options: s2 }, { errorCode: n2 }) => r3.test(e3) ^ s2.invert ? e3 : t3.error(n2, { name: s2.name, regex: r3, value: e3 }), jsonSchema: (e3, t3) => (t3.pattern = e3.args.regex.source, t3), args: ["regex", "options"], multi: true }, replace: { method(e3, t3) {
          "string" == typeof e3 && (e3 = new RegExp(n(e3), "g")), s(e3 instanceof RegExp, "pattern must be a RegExp"), s("string" == typeof t3, "replacement must be a String");
          const r3 = this.clone();
          return r3.$_terms.replacements || (r3.$_terms.replacements = []), r3.$_terms.replacements.push({ pattern: e3, replacement: t3 }), r3;
        } }, token: { method() {
          return this.$_addRule("token");
        }, validate: (e3, t3) => /^\w+$/.test(e3) ? e3 : t3.error("string.token"), jsonSchema: (e3, t3) => (t3.format = "token", t3) }, trim: { method(e3 = true) {
          return s("boolean" == typeof e3, "enabled must be a boolean"), this.$_addRule({ name: "trim", args: { enabled: e3 } });
        }, validate: (e3, t3, { enabled: r3 }) => r3 && e3 !== e3.trim() ? t3.error("string.trim") : e3, convert: true }, truncate: { method(e3 = true) {
          return s("boolean" == typeof e3, "enabled must be a boolean"), this.$_setFlag("truncate", e3);
        } }, uppercase: { method() {
          return this.case("upper");
        } }, uri: { method(e3 = {}) {
          f.assertOptions(e3, ["allowRelative", "allowQuerySquareBrackets", "domain", "relativeOnly", "scheme", "encodeUri"]), e3.domain && f.assertOptions(e3.domain, ["allowFullyQualified", "allowUnicode", "maxDomainSegments", "minDomainSegments", "tlds"]);
          const { regex: t3, scheme: r3 } = l(e3), s2 = e3.domain ? m.addressOptions(e3.domain) : null;
          return this.$_addRule({ name: "uri", args: { options: e3 }, regex: t3, domain: s2, scheme: r3 });
        }, validate(e3, t3, { options: r3 }, { regex: s2, domain: n2, scheme: i2 }) {
          if (["http:/", "https:/"].includes(e3)) return t3.error("string.uri");
          let o2 = s2.exec(e3);
          if (!o2 && t3.prefs.convert && r3.encodeUri) {
            const t4 = encodeURI(e3);
            o2 = s2.exec(t4), o2 && (e3 = t4);
          }
          if (o2) {
            const s3 = o2[1] || o2[2];
            return !n2 || r3.allowRelative && !s3 || a(s3, n2) ? e3 : t3.error("string.domain", { value: s3 });
          }
          return r3.relativeOnly ? t3.error("string.uriRelativeOnly") : r3.scheme ? t3.error("string.uriCustomScheme", { scheme: i2, value: e3 }) : t3.error("string.uri");
        }, jsonSchema: (e3, t3) => (t3.format = "uri", t3) } }, manifest: { build(e3, t3) {
          if (t3.replacements) for (const { pattern: r3, replacement: s2 } of t3.replacements) e3 = e3.replace(r3, s2);
          return e3;
        } }, messages: { "string.alphanum": "{{#label}} must only contain alpha-numeric characters", "string.base": "{{#label}} must be a string", "string.base64": "{{#label}} must be a valid base64 string", "string.creditCard": "{{#label}} must be a credit card", "string.dataUri": "{{#label}} must be a valid dataUri string", "string.domain": "{{#label}} must contain a valid domain name", "string.email": "{{#label}} must be a valid email", "string.empty": "{{#label}} is not allowed to be empty", "string.guid": "{{#label}} must be a valid GUID", "string.hex": "{{#label}} must only contain hexadecimal characters", "string.hexAlign": "{{#label}} hex decoded representation must be byte aligned", "string.hostname": "{{#label}} must be a valid hostname", "string.ip": "{{#label}} must be a valid ip address with a {{#cidr}} CIDR", "string.ipVersion": "{{#label}} must be a valid ip address of one of the following versions {{#version}} with a {{#cidr}} CIDR", "string.isoDate": "{{#label}} must be in iso format", "string.isoDuration": "{{#label}} must be a valid ISO 8601 duration", "string.length": "{{#label}} length must be {{#limit}} characters long", "string.lowercase": "{{#label}} must only contain lowercase characters", "string.max": "{{#label}} length must be less than or equal to {{#limit}} characters long", "string.min": "{{#label}} length must be at least {{#limit}} characters long", "string.normalize": "{{#label}} must be unicode normalized in the {{#form}} form", "string.token": "{{#label}} must only contain alpha-numeric and underscore characters", "string.pattern.base": "{{#label}} with value {:[.]} fails to match the required pattern: {{#regex}}", "string.pattern.name": "{{#label}} with value {:[.]} fails to match the {{#name}} pattern", "string.pattern.invert.base": "{{#label}} with value {:[.]} matches the inverted pattern: {{#regex}}", "string.pattern.invert.name": "{{#label}} with value {:[.]} matches the inverted {{#name}} pattern", "string.trim": "{{#label}} must not have leading or trailing whitespace", "string.uri": "{{#label}} must be a valid uri", "string.uriCustomScheme": "{{#label}} must be a valid uri with a scheme matching the {{#scheme}} pattern", "string.uriRelativeOnly": "{{#label}} must be a valid relative uri", "string.uppercase": "{{#label}} must only contain uppercase characters" } }), m.addressOptions = function(e3) {
          if (!e3) return m.tlds || e3;
          if (s(void 0 === e3.minDomainSegments || Number.isSafeInteger(e3.minDomainSegments) && e3.minDomainSegments > 0, "minDomainSegments must be a positive integer"), s(void 0 === e3.maxDomainSegments || Number.isSafeInteger(e3.maxDomainSegments) && e3.maxDomainSegments > 0, "maxDomainSegments must be a positive integer"), false === e3.tlds) return e3;
          if (true === e3.tlds || void 0 === e3.tlds) return s(m.tlds, "Built-in TLD list disabled"), Object.assign({}, e3, m.tlds);
          s("object" == typeof e3.tlds, "tlds must be true, false, or an object");
          const t3 = e3.tlds.deny;
          if (t3) return Array.isArray(t3) && (e3 = Object.assign({}, e3, { tlds: { deny: new Set(t3) } })), s(e3.tlds.deny instanceof Set, "tlds.deny must be an array, Set, or boolean"), s(!e3.tlds.allow, "Cannot specify both tlds.allow and tlds.deny lists"), m.validateTlds(e3.tlds.deny, "tlds.deny"), e3;
          const r3 = e3.tlds.allow;
          return r3 ? true === r3 ? (s(m.tlds, "Built-in TLD list disabled"), Object.assign({}, e3, m.tlds)) : (Array.isArray(r3) && (e3 = Object.assign({}, e3, { tlds: { allow: new Set(r3) } })), s(e3.tlds.allow instanceof Set, "tlds.allow must be an array, Set, or boolean"), m.validateTlds(e3.tlds.allow, "tlds.allow"), e3) : { ...e3, tlds: false };
        }, m.validateTlds = function(e3, t3) {
          for (const r3 of e3) s(a(r3, { minDomainSegments: 1, maxDomainSegments: 1 }), `${t3} must contain valid top level domain names`);
        }, m.isoDate = function(e3) {
          if (!f.isIsoDate(e3)) return null;
          /.*T.*[+-]\d\d$/.test(e3) && (e3 += "00");
          const t3 = new Date(e3);
          return isNaN(t3.getTime()) ? null : t3.toISOString();
        }, m.length = function(e3, t3, r3, n2, a2) {
          return s(!a2 || false, "Invalid encoding:", a2), e3.$_addRule({ name: t3, method: "length", args: { limit: r3, encoding: a2 }, operator: n2 });
        };
      }, 5008(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = r2(680), a = {};
        a.Map = class extends Map {
          slice() {
            return new a.Map(this);
          }
        }, e2.exports = n.extend({ type: "symbol", terms: { map: { init: new a.Map() } }, coerce: { method(e3, { schema: t3, error: r3 }) {
          const s2 = t3.$_terms.map.get(e3);
          return s2 && (e3 = s2), t3._flags.only && "symbol" != typeof e3 ? { value: e3, errors: r3("symbol.map", { map: t3.$_terms.map }) } : { value: e3 };
        } }, validate(e3, { error: t3 }) {
          if ("symbol" != typeof e3) return { value: e3, errors: t3("symbol.base") };
        }, rules: { map: { method(e3) {
          e3 && !e3[Symbol.iterator] && "object" == typeof e3 && (e3 = Object.entries(e3)), s(e3 && e3[Symbol.iterator], "Iterable must be an iterable or object");
          const t3 = this.clone(), r3 = [];
          for (const n2 of e3) {
            s(n2 && n2[Symbol.iterator], "Entry must be an iterable");
            const [e4, a2] = n2;
            s("object" != typeof e4 && "function" != typeof e4 && "symbol" != typeof e4, "Key must not be of type object, function, or Symbol"), s("symbol" == typeof a2, "Value must be a Symbol"), t3.$_terms.map.set(e4, a2), r3.push(a2);
          }
          return t3.valid(...r3);
        } } }, manifest: { build: (e3, t3) => (t3.map && (e3 = e3.map(t3.map)), e3) }, jsonSchema(e3, t3, r3, s2) {
          const n2 = e3.$_terms.map;
          return n2.size ? { anyOf: Array.from(n2.keys()).map((e4) => ({ const: e4 })) } : {};
        }, messages: { "symbol.base": "{{#label}} must be a symbol", "symbol.map": "{{#label}} must be one of {{#map}}" } });
      }, 1190(e2, t2, r2) {
        "use strict";
        const { assert: s, clone: n, ignore: a, reach: i } = r2(3115), o = r2(9415), l = r2(8013), c = r2(4957), u = { result: /* @__PURE__ */ Symbol("result") };
        t2.entry = function(e3, t3, r3) {
          let n2 = o.defaults;
          r3 && (s(void 0 === r3.warnings, "Cannot override warnings preference in synchronous validation"), s(void 0 === r3.artifacts, "Cannot override artifacts preference in synchronous validation"), n2 = o.preferences(o.defaults, r3));
          const a2 = u.entry(e3, t3, n2);
          s(!a2.mainstay.externals.length, "Schema with external rules must use validateAsync()");
          const i2 = { value: a2.value };
          return a2.error && (i2.error = a2.error), a2.mainstay.warnings.length && (i2.warning = l.details(a2.mainstay.warnings)), a2.mainstay.debug && (i2.debug = a2.mainstay.debug), a2.mainstay.artifacts && (i2.artifacts = a2.mainstay.artifacts), i2;
        }, t2.entryAsync = async function(e3, t3, r3) {
          let s2 = o.defaults;
          r3 && (s2 = o.preferences(o.defaults, r3));
          const n2 = u.entry(e3, t3, s2), a2 = n2.mainstay;
          if (n2.error) throw a2.debug && (n2.error.debug = a2.debug), n2.error;
          if (a2.externals.length) {
            let t4 = n2.value;
            const c3 = [];
            for (const n3 of a2.externals) {
              const f = n3.state.path, m = "link" === n3.schema.type ? a2.links.get(n3.schema) : null;
              let h, p, d = t4;
              const g = f.length ? [t4] : [], y = f.length ? i(e3, f) : e3;
              if (f.length) {
                h = f[f.length - 1];
                let e4 = t4;
                for (const t5 of f.slice(0, -1)) e4 = e4[t5], g.unshift(e4);
                p = g[0], d = p[h];
              }
              try {
                const e4 = (e5, t5) => (m || n3.schema).$_createError(e5, d, t5, n3.state, s2), i2 = await n3.method(d, { schema: n3.schema, linked: m, state: n3.state, prefs: r3, original: y, error: e4, errorsArray: u.errorsArray, warn: (e5, t5) => a2.warnings.push((m || n3.schema).$_createError(e5, d, t5, n3.state, s2)), message: (e5, t5) => (m || n3.schema).$_createError("external", d, t5, n3.state, s2, { messages: e5 }) });
                if (void 0 === i2 || i2 === d) continue;
                if (i2 instanceof l.Report) {
                  if (a2.tracer.log(n3.schema, n3.state, "rule", "external", "error"), c3.push(i2), s2.abortEarly) break;
                  continue;
                }
                if (Array.isArray(i2) && i2[o.symbols.errors]) {
                  if (a2.tracer.log(n3.schema, n3.state, "rule", "external", "error"), c3.push(...i2), s2.abortEarly) break;
                  continue;
                }
                p ? (a2.tracer.value(n3.state, "rule", d, i2, "external"), p[h] = i2) : (a2.tracer.value(n3.state, "rule", t4, i2, "external"), t4 = i2);
              } catch (e4) {
                throw s2.errors.label && (e4.message += ` (${n3.label})`), e4;
              }
            }
            if (n2.value = t4, c3.length) throw n2.error = l.process(c3, e3, s2), a2.debug && (n2.error.debug = a2.debug), n2.error;
          }
          if (!s2.warnings && !s2.debug && !s2.artifacts) return n2.value;
          const c2 = { value: n2.value };
          return a2.warnings.length && (c2.warning = l.details(a2.warnings)), a2.debug && (c2.debug = a2.debug), a2.artifacts && (c2.artifacts = a2.artifacts), c2;
        }, t2.standard = function(e3, r3, s2) {
          const n2 = null == s2 ? void 0 : s2.libraryOptions;
          return r3.isAsync() ? t2.entryAsync(e3, r3, n2) : t2.entry(e3, r3, n2);
        }, u.Mainstay = class {
          constructor(e3, t3, r3) {
            this.externals = [], this.warnings = [], this.tracer = e3, this.debug = t3, this.links = r3, this.shadow = null, this.artifacts = null, this._snapshots = [];
          }
          snapshot() {
            this._snapshots.push({ externals: this.externals.slice(), warnings: this.warnings.slice() });
          }
          restore() {
            const e3 = this._snapshots.pop();
            this.externals = e3.externals, this.warnings = e3.warnings;
          }
          commit() {
            this._snapshots.pop();
          }
        }, u.entry = function(e3, r3, s2) {
          const { tracer: n2, cleanup: a2 } = u.tracer(r3, s2), i2 = s2.debug ? [] : null, o2 = r3._ids._schemaChain ? /* @__PURE__ */ new Map() : null, f = new u.Mainstay(n2, i2, o2), m = r3._ids._schemaChain ? [{ schema: r3 }] : null, h = new c([], [], { mainstay: f, schemas: m }), p = t2.validate(e3, r3, h, s2);
          a2 && r3.$_root.untrace();
          const d = l.process(p.errors, e3, s2);
          return { value: p.value, error: d, mainstay: f };
        }, u.tracer = function(e3, t3) {
          return e3.$_root._tracer ? { tracer: e3.$_root._tracer._register(e3) } : t3.debug ? (s(e3.$_root.trace, "Debug mode not supported"), { tracer: e3.$_root.trace()._register(e3), cleanup: true }) : { tracer: u.ignore };
        }, t2.validate = function(e3, t3, r3, s2, n2 = {}) {
          if (t3.$_terms.whens && (t3 = t3._generate(e3, r3, s2).schema), t3._preferences && (s2 = u.prefs(t3, s2)), t3._cache && s2.cache) {
            const s3 = t3._cache.get(e3);
            if (r3.mainstay.tracer.debug(r3, "validate", "cached", !!s3), s3) return s3;
          }
          const a2 = (n3, a3, i3) => t3.$_createError(n3, e3, a3, i3 || r3, s2), i2 = { original: e3, prefs: s2, schema: t3, state: r3, error: a2, errorsArray: u.errorsArray, warn: (e4, t4, s3) => r3.mainstay.warnings.push(a2(e4, t4, s3)), message: (n3, a3) => t3.$_createError("custom", e3, a3, r3, s2, { messages: n3 }) };
          r3.mainstay.tracer.entry(t3, r3);
          const l2 = t3._definition;
          if (l2.prepare && void 0 !== e3 && s2.convert) {
            const t4 = l2.prepare(e3, i2);
            if (t4) {
              if (r3.mainstay.tracer.value(r3, "prepare", e3, t4.value), t4.errors) return u.finalize(t4.value, [].concat(t4.errors), i2);
              e3 = t4.value;
            }
          }
          if (l2.coerce && void 0 !== e3 && s2.convert && (!l2.coerce.from || l2.coerce.from.includes(typeof e3))) {
            const t4 = l2.coerce.method(e3, i2);
            if (t4) {
              if (r3.mainstay.tracer.value(r3, "coerced", e3, t4.value), t4.errors) return u.finalize(t4.value, [].concat(t4.errors), i2);
              e3 = t4.value;
            }
          }
          const c2 = t3._flags.empty;
          c2 && c2.$_match(u.trim(e3, t3), r3.nest(c2), o.defaults) && (r3.mainstay.tracer.value(r3, "empty", e3, void 0), e3 = void 0);
          const f = n2.presence || t3._flags.presence || (t3._flags._endedSwitch ? null : s2.presence);
          if (void 0 === e3) {
            if ("forbidden" === f) return u.finalize(e3, null, i2);
            if ("required" === f) return u.finalize(e3, [t3.$_createError("any.required", e3, null, r3, s2)], i2);
            if ("optional" === f) {
              if (t3._flags.default !== o.symbols.deepDefault) return u.finalize(e3, null, i2);
              r3.mainstay.tracer.value(r3, "default", e3, {}), e3 = {};
            }
          } else if ("forbidden" === f) return u.finalize(e3, [t3.$_createError("any.unknown", e3, null, r3, s2)], i2);
          const m = [];
          if (t3._valids) {
            const n3 = t3._valids.get(e3, r3, s2, t3._flags.insensitive);
            if (n3) return s2.convert && (r3.mainstay.tracer.value(r3, "valids", e3, n3.value), e3 = n3.value), r3.mainstay.tracer.filter(t3, r3, "valid", n3), u.finalize(e3, null, i2);
            if (t3._flags.only) {
              const n4 = t3.$_createError("any.only", e3, { valids: t3._valids.values({ display: true }) }, r3, s2);
              if (s2.abortEarly) return u.finalize(e3, [n4], i2);
              m.push(n4);
            }
          }
          if (t3._invalids) {
            const n3 = t3._invalids.get(e3, r3, s2, t3._flags.insensitive);
            if (n3) {
              r3.mainstay.tracer.filter(t3, r3, "invalid", n3);
              const a3 = t3.$_createError("any.invalid", e3, { invalids: t3._invalids.values({ display: true }) }, r3, s2);
              if (s2.abortEarly) return u.finalize(e3, [a3], i2);
              m.push(a3);
            }
          }
          if (l2.validate) {
            const t4 = l2.validate(e3, i2);
            if (t4 && (r3.mainstay.tracer.value(r3, "base", e3, t4.value), e3 = t4.value, t4.errors)) {
              if (!Array.isArray(t4.errors)) return m.push(t4.errors), u.finalize(e3, m, i2);
              if (t4.errors.length) return m.push(...t4.errors), u.finalize(e3, m, i2);
            }
          }
          return t3._rules.length ? u.rules(e3, m, i2) : u.finalize(e3, m, i2);
        }, u.rules = function(e3, t3, r3) {
          const { schema: s2, state: n2, prefs: a2 } = r3;
          for (const i2 of s2._rules) {
            const l2 = s2._definition.rules[i2.method];
            if (l2.convert && a2.convert) {
              n2.mainstay.tracer.log(s2, n2, "rule", i2.name, "full");
              continue;
            }
            let c2, f = i2.args;
            if (i2._resolve.length) {
              f = Object.assign({}, f);
              for (const t4 of i2._resolve) {
                const r4 = l2.argsByName.get(t4), i3 = f[t4].resolve(e3, n2, a2), u2 = r4.normalize ? r4.normalize(i3) : i3, m2 = o.validateArg(u2, null, r4);
                if (m2) {
                  c2 = s2.$_createError("any.ref", i3, { arg: t4, ref: f[t4], reason: m2 }, n2, a2);
                  break;
                }
                f[t4] = u2;
              }
            }
            c2 = c2 || l2.validate(e3, r3, f, i2);
            const m = u.rule(c2, i2);
            if (m.errors) {
              if (n2.mainstay.tracer.log(s2, n2, "rule", i2.name, "error"), i2.warn) {
                n2.mainstay.warnings.push(...m.errors);
                continue;
              }
              if (a2.abortEarly) return u.finalize(e3, m.errors, r3);
              t3.push(...m.errors);
            } else n2.mainstay.tracer.log(s2, n2, "rule", i2.name, "pass"), n2.mainstay.tracer.value(n2, "rule", e3, m.value, i2.name), e3 = m.value;
          }
          return u.finalize(e3, t3, r3);
        }, u.rule = function(e3, t3) {
          return e3 instanceof l.Report ? (u.error(e3, t3), { errors: [e3], value: null }) : Array.isArray(e3) && e3[o.symbols.errors] ? (e3.forEach((e4) => u.error(e4, t3)), { errors: e3, value: null }) : { errors: null, value: e3 };
        }, u.error = function(e3, t3) {
          return t3.message && e3._setTemplate(t3.message), e3;
        }, u.finalize = function(e3, t3, r3) {
          t3 = t3 || [];
          const { schema: n2, state: a2, prefs: i2 } = r3;
          if (t3.length) {
            const s2 = u.default("failover", void 0, t3, r3);
            void 0 !== s2 && (a2.mainstay.tracer.value(a2, "failover", e3, s2), e3 = s2, t3 = []);
          }
          if (t3.length && n2._flags.error) if ("function" == typeof n2._flags.error) {
            t3 = n2._flags.error(t3), Array.isArray(t3) || (t3 = [t3]);
            for (const e4 of t3) s(e4 instanceof Error || e4 instanceof l.Report, "error() must return an Error object");
          } else t3 = [n2._flags.error];
          if (void 0 === e3) {
            const s2 = u.default("default", e3, t3, r3);
            a2.mainstay.tracer.value(a2, "default", e3, s2), e3 = s2;
          }
          if (n2._flags.cast && void 0 !== e3) {
            const t4 = n2._definition.cast[n2._flags.cast];
            if (t4.from(e3)) {
              const s2 = t4.to(e3, r3);
              a2.mainstay.tracer.value(a2, "cast", e3, s2, n2._flags.cast), e3 = s2;
            }
          }
          if (n2.$_terms.externals && i2.externals && false !== i2._externals) for (const { method: e4 } of n2.$_terms.externals) a2.mainstay.externals.push({ method: e4, schema: n2, state: a2, label: l.label(n2._flags, a2, i2) });
          const o2 = { value: e3, errors: t3.length ? t3 : null };
          return n2._flags.result && (o2.value = "strip" === n2._flags.result ? void 0 : r3.original, a2.mainstay.tracer.value(a2, n2._flags.result, e3, o2.value), a2.shadow(e3, n2._flags.result)), n2._cache && false !== i2.cache && !n2._refs.length && n2._cache.set(r3.original, o2), void 0 === e3 || o2.errors || void 0 === n2._flags.artifact || (a2.mainstay.artifacts = a2.mainstay.artifacts || /* @__PURE__ */ new Map(), a2.mainstay.artifacts.has(n2._flags.artifact) || a2.mainstay.artifacts.set(n2._flags.artifact, []), a2.mainstay.artifacts.get(n2._flags.artifact).push(a2.path)), o2;
        }, u.prefs = function(e3, t3) {
          const r3 = t3 === o.defaults;
          return r3 && e3._preferences[o.symbols.prefs] ? e3._preferences[o.symbols.prefs] : (t3 = o.preferences(t3, e3._preferences), r3 && (e3._preferences[o.symbols.prefs] = t3), t3);
        }, u.default = function(e3, t3, r3, s2) {
          const { schema: a2, state: i2, prefs: l2 } = s2, c2 = a2._flags[e3];
          if (l2.noDefaults || void 0 === c2) return t3;
          if (i2.mainstay.tracer.log(a2, i2, "rule", e3, "full"), !c2) return c2;
          if ("function" == typeof c2) {
            const t4 = c2.length ? [n(i2.ancestors[0]), s2] : [];
            try {
              return c2(...t4);
            } catch (t5) {
              return void r3.push(a2.$_createError(`any.${e3}`, null, { error: t5 }, i2, l2));
            }
          }
          return "object" != typeof c2 ? c2 : c2[o.symbols.literal] ? c2.literal : o.isResolvable(c2) ? c2.resolve(t3, i2, l2) : n(c2);
        }, u.trim = function(e3, t3) {
          if ("string" != typeof e3) return e3;
          const r3 = t3.$_getRule("trim");
          return r3 && r3.args.enabled ? e3.trim() : e3;
        }, u.ignore = { active: false, debug: a, entry: a, filter: a, log: a, resolve: a, value: a }, u.errorsArray = function() {
          const e3 = [];
          return e3[o.symbols.errors] = true, e3;
        };
      }, 6220(e2, t2, r2) {
        "use strict";
        const { assert: s, deepEqual: n } = r2(3115), a = r2(9415), i = {};
        e2.exports = i.Values = class {
          constructor(e3, t3) {
            this._values = new Set(e3), this._refs = new Set(t3), this._lowercase = i.lowercases(e3), this._override = false;
          }
          get length() {
            return this._values.size + this._refs.size;
          }
          add(e3, t3) {
            a.isResolvable(e3) ? this._refs.has(e3) || (this._refs.add(e3), t3 && t3.register(e3)) : this.has(e3, null, null, false) || (this._values.add(e3), "string" == typeof e3 && this._lowercase.set(e3.toLowerCase(), e3));
          }
          static merge(e3, t3, r3) {
            if (e3 = e3 || new i.Values(), t3) {
              if (t3._override) return t3.clone();
              for (const r4 of [...t3._values, ...t3._refs]) e3.add(r4);
            }
            if (r3) for (const t4 of [...r3._values, ...r3._refs]) e3.remove(t4);
            return e3.length ? e3 : null;
          }
          remove(e3) {
            a.isResolvable(e3) ? this._refs.delete(e3) : (this._values.delete(e3), "string" == typeof e3 && this._lowercase.delete(e3.toLowerCase()));
          }
          has(e3, t3, r3, s2) {
            return !!this.get(e3, t3, r3, s2);
          }
          get(e3, t3, r3, s2) {
            if (!this.length) return false;
            if (this._values.has(e3)) return { value: e3 };
            if ("string" == typeof e3 && e3 && s2) {
              const t4 = this._lowercase.get(e3.toLowerCase());
              if (t4) return { value: t4 };
            }
            if (!this._refs.size && "object" != typeof e3) return false;
            if ("object" == typeof e3) {
              for (const t4 of this._values) if (n(t4, e3)) return { value: t4 };
            }
            if (t3) for (const a2 of this._refs) {
              const i2 = a2.resolve(e3, t3, r3, null, { in: true });
              if (void 0 === i2) continue;
              const o = a2.in && "object" == typeof i2 ? Array.isArray(i2) ? i2 : Object.keys(i2) : [i2];
              for (const t4 of o) if (typeof t4 == typeof e3) {
                if (s2 && e3 && "string" == typeof e3) {
                  if (t4.toLowerCase() === e3.toLowerCase()) return { value: t4, ref: a2 };
                } else if (n(t4, e3)) return { value: t4, ref: a2 };
              }
            }
            return false;
          }
          override() {
            this._override = true;
          }
          values(e3) {
            if (e3 && e3.display) {
              const e4 = [];
              for (const t3 of [...this._values, ...this._refs]) void 0 !== t3 && e4.push(t3);
              return e4;
            }
            return Array.from([...this._values, ...this._refs]);
          }
          clone() {
            const e3 = new i.Values(this._values, this._refs);
            return e3._override = this._override, e3;
          }
          concat(e3) {
            s(!e3._override, "Cannot concat override set of values");
            const t3 = new i.Values([...this._values, ...e3._values], [...this._refs, ...e3._refs]);
            return t3._override = this._override, t3;
          }
          describe() {
            const e3 = [];
            this._override && e3.push({ override: true });
            for (const t3 of this._values.values()) e3.push(t3 && "object" == typeof t3 ? { value: t3 } : t3);
            for (const t3 of this._refs.values()) e3.push(t3.describe());
            return e3;
          }
        }, i.Values.prototype[a.symbols.values] = true, i.Values.prototype.slice = i.Values.prototype.clone, i.lowercases = function(e3) {
          const t3 = /* @__PURE__ */ new Map();
          if (e3) for (const r3 of e3) "string" == typeof r3 && t3.set(r3.toLowerCase(), r3);
          return t3;
        };
      }, 9089(e2, t2, r2) {
        "use strict";
        r2.d(t2, { ipRegex: () => C, isDomainValid: () => h, isEmailValid: () => y, uriRegex: () => T });
        var s = r2(8663);
        const n = { EMPTY_STRING: "Address must be a non-empty string", FORBIDDEN_UNICODE: "Address contains forbidden Unicode characters", MULTIPLE_AT_CHAR: "Address cannot contain more than one @ character", MISSING_AT_CHAR: "Address must contain one @ character", EMPTY_LOCAL: "Address local part cannot be empty", ADDRESS_TOO_LONG: "Address too long", LOCAL_TOO_LONG: "Address local part too long", EMPTY_LOCAL_SEGMENT: "Address local part contains empty dot-separated segment", INVALID_LOCAL_CHARS: "Address local part contains invalid character", DOMAIN_NON_EMPTY_STRING: "Domain must be a non-empty string", DOMAIN_TOO_LONG: "Domain too long", DOMAIN_INVALID_UNICODE_CHARS: "Domain contains forbidden Unicode characters", DOMAIN_INVALID_CHARS: "Domain contains invalid character", DOMAIN_INVALID_TLDS_CHARS: "Domain contains invalid tld character", DOMAIN_SEGMENTS_COUNT: "Domain lacks the minimum required number of segments", DOMAIN_SEGMENTS_COUNT_MAX: "Domain contains too many segments", DOMAIN_FORBIDDEN_TLDS: "Domain uses forbidden TLD", DOMAIN_EMPTY_SEGMENT: "Domain contains empty dot-separated segment", DOMAIN_LONG_SEGMENT: "Domain contains dot-separated segment that is too long" };
        function a(e3) {
          return { code: e3, error: n[e3] };
        }
        const i = /[^\x00-\x7f]/, o = /[\x00-\x20@\:\/\\#!\$&\'\(\)\*\+,;=\?]/, l = /^[a-zA-Z](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?$/, c = /^[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?$/, u = /^[a-zA-Z0-9_](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?$/, f = s.URL || URL;
        function m(e3, t3 = {}) {
          if (!e3) return a("DOMAIN_NON_EMPTY_STRING");
          if ("string" != typeof e3) throw new Error("Invalid input: domain must be a string");
          if (e3.length > 256) return a("DOMAIN_TOO_LONG");
          if (i.test(e3)) {
            if (false === t3.allowUnicode) return a("DOMAIN_INVALID_UNICODE_CHARS");
            e3 = e3.normalize("NFC");
          }
          if (o.test(e3)) return a("DOMAIN_INVALID_CHARS");
          e3 = (function(e4) {
            e4.includes("%") && (e4 = e4.replace(/%/g, "%25"));
            try {
              return new f(`http://${e4}`).host;
            } catch (t4) {
              return e4;
            }
          })(e3), t3.allowFullyQualified && "." === e3[e3.length - 1] && (e3 = e3.slice(0, -1));
          const r3 = t3.minDomainSegments || 2, s2 = e3.split(".");
          if (s2.length < r3) return a("DOMAIN_SEGMENTS_COUNT");
          if (t3.maxDomainSegments && s2.length > t3.maxDomainSegments) return a("DOMAIN_SEGMENTS_COUNT_MAX");
          const n2 = t3.tlds;
          if (n2) {
            const e4 = s2[s2.length - 1].toLowerCase();
            if ((function(e5) {
              return !!e5.allow;
            })(n2)) {
              if (!n2.allow.has(e4)) return a("DOMAIN_FORBIDDEN_TLDS");
            } else if (n2.deny.has(e4)) return a("DOMAIN_FORBIDDEN_TLDS");
          }
          for (let e4 = 0; e4 < s2.length; ++e4) {
            const r4 = s2[e4];
            if (!r4.length) return a("DOMAIN_EMPTY_SEGMENT");
            if (r4.length > 63) return a("DOMAIN_LONG_SEGMENT");
            if (e4 < s2.length - 1) {
              if (t3.allowUnderscore) {
                if (!u.test(r4)) return a("DOMAIN_INVALID_CHARS");
              } else if (!c.test(r4)) return a("DOMAIN_INVALID_CHARS");
            } else if (!l.test(r4)) return a("DOMAIN_INVALID_TLDS_CHARS");
          }
          return null;
        }
        function h(e3, t3) {
          return !m(e3, t3);
        }
        var p = r2(6984);
        const d = /[^\x00-\x7f]/, g = new (p.TextEncoder || TextEncoder)();
        function y(e3, t3) {
          return !(function(e4, t4 = {}) {
            if ("string" != typeof e4) throw new Error("Invalid input: email must be a string");
            if (!e4) return a("EMPTY_STRING");
            const r3 = !d.test(e4);
            if (!r3) {
              if (false === t4.allowUnicode) return a("FORBIDDEN_UNICODE");
              e4 = e4.normalize("NFC");
            }
            const s2 = e4.split("@");
            if (2 !== s2.length) return s2.length > 2 ? a("MULTIPLE_AT_CHAR") : a("MISSING_AT_CHAR");
            const [n2, i2] = s2;
            if (!n2) return a("EMPTY_LOCAL");
            if (!t4.ignoreLength) {
              if (e4.length > 254) return a("ADDRESS_TOO_LONG");
              if (g.encode(n2).length > 64) return a("LOCAL_TOO_LONG");
            }
            return (function(e5, t5) {
              const r4 = e5.split(".");
              for (const e6 of r4) {
                if (!e6.length) return a("EMPTY_LOCAL_SEGMENT");
                if (t5) {
                  if (!v.test(e6)) return a("INVALID_LOCAL_CHARS");
                } else for (const t6 of e6) {
                  if (v.test(t6)) continue;
                  const e7 = b(t6);
                  if (!_.test(e7)) return a("INVALID_LOCAL_CHARS");
                }
              }
              return null;
            })(n2, r3) || m(i2, t4);
          })(e3, t3);
        }
        function b(e3) {
          return Array.from(g.encode(e3), (e4) => String.fromCharCode(e4)).join("");
        }
        const v = /^[\w!#\$%&'\*\+\-/=\?\^`\{\|\}~]+$/, _ = new RegExp(["(?:[\\xc2-\\xdf][\\x80-\\xbf])", "(?:\\xe0[\\xa0-\\xbf][\\x80-\\xbf])|(?:[\\xe1-\\xec][\\x80-\\xbf]{2})|(?:\\xed[\\x80-\\x9f][\\x80-\\xbf])|(?:[\\xee-\\xef][\\x80-\\xbf]{2})", "(?:\\xf0[\\x90-\\xbf][\\x80-\\xbf]{2})|(?:[\\xf1-\\xf3][\\x80-\\xbf]{3})|(?:\\xf4[\\x80-\\x8f][\\x80-\\xbf]{2})"].join("|"));
        var A = r2(8253), S = r2.n(A), E = r2(8669), R = r2.n(E);
        const O = (function() {
          const e3 = {}, t3 = "\\dA-Fa-f", r3 = "[" + t3 + "]", s2 = "\\w-\\.~", n2 = "!\\$&'\\(\\)\\*\\+,;=", a2 = "%" + t3, i2 = s2 + a2 + n2 + ":@", o2 = "[" + i2 + "]", l2 = "(?:0{0,2}\\d|0?[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])";
          e3.ipv4address = "(?:" + l2 + "\\.){3}" + l2;
          const c2 = r3 + "{1,4}", u2 = "(?:" + c2 + ":" + c2 + "|" + e3.ipv4address + ")", f2 = "(?:" + c2 + ":){6}" + u2, m2 = "::(?:" + c2 + ":){5}" + u2, h2 = "(?:" + c2 + ")?::(?:" + c2 + ":){4}" + u2, p2 = "(?:(?:" + c2 + ":){0,1}" + c2 + ")?::(?:" + c2 + ":){3}" + u2, d2 = "(?:(?:" + c2 + ":){0,2}" + c2 + ")?::(?:" + c2 + ":){2}" + u2, g2 = "(?:(?:" + c2 + ":){0,3}" + c2 + ")?::" + c2 + ":" + u2, y2 = "(?:(?:" + c2 + ":){0,4}" + c2 + ")?::" + u2, b2 = "(?:(?:" + c2 + ":){0,5}" + c2 + ")?::" + c2, v2 = "(?:(?:" + c2 + ":){0,6}" + c2 + ")?::";
          e3.ipv4Cidr = "(?:\\d|[1-2]\\d|3[0-2])", e3.ipv6Cidr = "(?:0{0,2}\\d|0?[1-9]\\d|1[01]\\d|12[0-8])", e3.ipv6address = "(?:" + f2 + "|" + m2 + "|" + h2 + "|" + p2 + "|" + d2 + "|" + g2 + "|" + y2 + "|" + b2 + "|" + v2 + ")", e3.ipvFuture = "v" + r3 + "+\\.[" + s2 + n2 + ":]+", e3.scheme = "[a-zA-Z][a-zA-Z\\d+-\\.]*", e3.schemeRegex = new RegExp(e3.scheme);
          const _2 = "[" + s2 + a2 + n2 + ":]*", A2 = "[" + s2 + a2 + n2 + "]{1,255}", S2 = "(?:\\[(?:" + e3.ipv6address + "|" + e3.ipvFuture + ")\\]|" + e3.ipv4address + "|" + A2 + ")", E2 = "(?:" + _2 + "@)?" + S2 + "(?::\\d*)?", R2 = "(?:" + _2 + "@)?(" + S2 + ")(?::\\d*)?", O2 = o2 + "*", w2 = o2 + "+", N2 = "(?:\\/" + O2 + ")*", I2 = "\\/(?:" + w2 + N2 + ")?", $2 = w2 + N2, T2 = "[" + s2 + a2 + n2 + "@]+" + N2, C2 = "(?:\\/\\/\\/" + O2 + N2 + ")";
          return e3.hierPart = "(?:(?:\\/\\/" + E2 + N2 + ")|" + I2 + "|" + $2 + "|" + C2 + ")", e3.hierPartCapture = "(?:(?:\\/\\/" + R2 + N2 + ")|" + I2 + "|" + $2 + ")", e3.relativeRef = "(?:(?:\\/\\/" + E2 + N2 + ")|" + I2 + "|" + T2 + "|)", e3.relativeRefCapture = "(?:(?:\\/\\/" + R2 + N2 + ")|" + I2 + "|" + T2 + "|)", e3.query = "[" + i2 + "\\/\\?]*(?=#|$)", e3.queryWithSquareBrackets = "[" + i2 + "\\[\\]\\/\\?]*(?=#|$)", e3.fragment = "[" + i2 + "\\/\\?]*", e3;
        })(), w = { v4Cidr: O.ipv4Cidr, v6Cidr: O.ipv6Cidr, ipv4: O.ipv4address, ipv6: O.ipv6address, ipvfuture: O.ipvFuture };
        function N(e3) {
          const t3 = O, r3 = "(?:\\?" + (e3.allowQuerySquareBrackets ? t3.queryWithSquareBrackets : t3.query) + ")?(?:#" + t3.fragment + ")?", s2 = e3.domain ? t3.relativeRefCapture : t3.relativeRef;
          if (e3.relativeOnly) return I(s2 + r3);
          let n2 = "";
          if (e3.scheme) {
            S()(e3.scheme instanceof RegExp || "string" == typeof e3.scheme || Array.isArray(e3.scheme), "scheme must be a RegExp, String, or Array");
            const r4 = [].concat(e3.scheme);
            S()(r4.length >= 1, "scheme must have at least 1 scheme specified");
            const s3 = [];
            for (let e4 = 0; e4 < r4.length; ++e4) {
              const n3 = r4[e4];
              S()(n3 instanceof RegExp || "string" == typeof n3, "scheme at position " + e4 + " must be a RegExp or String"), n3 instanceof RegExp ? s3.push(n3.source.toString()) : (S()(t3.schemeRegex.test(n3), "scheme at position " + e4 + " must be a valid scheme"), s3.push(R()(n3)));
            }
            n2 = s3.join("|");
          }
          const a2 = "(?:" + (n2 ? "(?:" + n2 + ")" : t3.scheme) + ":" + (e3.domain ? t3.hierPartCapture : t3.hierPart) + ")";
          return I((e3.allowRelative ? "(?:" + a2 + "|" + s2 + ")" : a2) + r3, n2);
        }
        function I(e3, t3 = null) {
          return { raw: e3 = `(?=.)(?!https?:/(?:$|[^/]))(?!https?:///)(?!https?:[^/])${e3}`, regex: new RegExp(`^${e3}$`), scheme: t3 };
        }
        const $ = N({});
        function T(e3 = {}) {
          return e3.scheme || e3.allowRelative || e3.relativeOnly || e3.allowQuerySquareBrackets || e3.domain ? N(e3) : $;
        }
        function C(e3 = {}) {
          const t3 = e3.cidr || "optional";
          S()(["required", "optional", "forbidden"].includes(t3), "options.cidr must be one of required, optional, forbidden"), S()(void 0 === e3.version || "string" == typeof e3.version || Array.isArray(e3.version), "options.version must be a string or an array of string");
          let r3 = e3.version || ["ipv4", "ipv6", "ipvfuture"];
          Array.isArray(r3) || (r3 = [r3]), S()(r3.length >= 1, "options.version must have at least 1 version specified");
          for (const e4 of r3) S()("string" == typeof e4 && e4 === e4.toLowerCase(), "Invalid options.version value"), S()(["ipv4", "ipv6", "ipvfuture"].includes(e4), "options.version contains unknown version " + e4 + " - must be one of ipv4, ipv6, ipvfuture");
          r3 = Array.from(new Set(r3));
          const s2 = `(?:${r3.map((e4) => {
            if ("forbidden" === t3) return w[e4];
            const r4 = `\\/${"ipv4" === e4 ? w.v4Cidr : w.v6Cidr}`;
            return "required" === t3 ? `${w[e4]}${r4}` : `${w[e4]}(?:${r4})?`;
          }).join("|")})`, n2 = new RegExp(`^${s2}$`);
          return { cidr: t3, versions: r3, regex: n2, raw: s2 };
        }
      }, 679(e2, t2) {
        "use strict";
        const r2 = { operators: ["!", "^", "*", "/", "%", "+", "-", "<", "<=", ">", ">=", "==", "!=", "&&", "||", "??"], operatorCharacters: ["!", "^", "*", "/", "%", "+", "-", "<", "=", ">", "&", "|", "?"], operatorsOrder: [["^"], ["*", "/", "%"], ["+", "-"], ["<", "<=", ">", ">="], ["==", "!="], ["&&"], ["||", "??"]], operatorsPrefix: ["!", "n"], literals: { '"': '"', "`": "`", "'": "'", "[": "]" }, numberRx: /^(?:[0-9]*(\.[0-9]*)?){1}$/, tokenRx: /^[\w\$\#\.\@\:\{\}]+$/, symbol: /* @__PURE__ */ Symbol("formula"), settings: /* @__PURE__ */ Symbol("settings") };
        t2.Parser = class {
          constructor(e3, t3 = {}) {
            if (!t3[r2.settings] && t3.constants) for (const e4 in t3.constants) {
              const r3 = t3.constants[e4];
              if (null !== r3 && !["boolean", "number", "string"].includes(typeof r3)) throw new Error(`Formula constant ${e4} contains invalid ${typeof r3} value type`);
            }
            this.settings = t3[r2.settings] ? t3 : Object.assign({ [r2.settings]: true, constants: {}, functions: {} }, t3), this.single = null, this._parts = null, this._parse(e3);
          }
          _parse(e3) {
            let s = [], n = "", a = 0, i = false;
            const o = (e4) => {
              if (a) throw new Error("Formula missing closing parenthesis");
              const o2 = s.length ? s[s.length - 1] : null;
              if (i || n || e4) {
                if (o2 && "reference" === o2.type && ")" === e4) return o2.type = "function", o2.value = this._subFormula(n, o2.value), void (n = "");
                if (")" === e4) {
                  const e5 = new t2.Parser(n, this.settings);
                  s.push({ type: "segment", value: e5 });
                } else if (i) {
                  if ("]" === i) return s.push({ type: "reference", value: n }), void (n = "");
                  s.push({ type: "literal", value: n });
                } else if (r2.operatorCharacters.includes(n)) o2 && "operator" === o2.type && r2.operators.includes(o2.value + n) ? o2.value += n : s.push({ type: "operator", value: n });
                else if (n.match(r2.numberRx)) s.push({ type: "constant", value: parseFloat(n) });
                else if (void 0 !== this.settings.constants[n]) s.push({ type: "constant", value: this.settings.constants[n] });
                else {
                  if (!n.match(r2.tokenRx)) throw new Error(`Formula contains invalid token: ${n}`);
                  s.push({ type: "reference", value: n });
                }
                n = "";
              }
            };
            for (const t3 of e3) i ? t3 === i ? (o(), i = false) : n += t3 : a ? "(" === t3 ? (n += t3, ++a) : ")" === t3 ? (--a, a ? n += t3 : o(t3)) : n += t3 : t3 in r2.literals ? i = r2.literals[t3] : "(" === t3 ? (o(), ++a) : r2.operatorCharacters.includes(t3) ? (o(), n = t3, o()) : " " !== t3 ? n += t3 : o();
            o(), s = s.map((e4, t3) => "operator" !== e4.type || "-" !== e4.value || t3 && "operator" !== s[t3 - 1].type ? e4 : { type: "operator", value: "n" });
            let l = false;
            for (const e4 of s) {
              if ("operator" === e4.type) {
                if (r2.operatorsPrefix.includes(e4.value)) continue;
                if (!l) throw new Error("Formula contains an operator in invalid position");
                if (!r2.operators.includes(e4.value)) throw new Error(`Formula contains an unknown operator ${e4.value}`);
              } else if (l) throw new Error("Formula missing expected operator");
              l = !l;
            }
            if (!l) throw new Error("Formula contains invalid trailing operator");
            1 === s.length && ["reference", "literal", "constant"].includes(s[0].type) && (this.single = { type: "reference" === s[0].type ? "reference" : "value", value: s[0].value }), this._parts = s.map((e4) => {
              if ("operator" === e4.type) return r2.operatorsPrefix.includes(e4.value) ? e4 : e4.value;
              if ("reference" !== e4.type) return e4.value;
              if (this.settings.tokenRx && !this.settings.tokenRx.test(e4.value)) throw new Error(`Formula contains invalid reference ${e4.value}`);
              return this.settings.reference ? this.settings.reference(e4.value) : r2.reference(e4.value);
            });
          }
          _subFormula(e3, s) {
            const n = this.settings.functions[s];
            if ("function" != typeof n) throw new Error(`Formula contains unknown function ${s}`);
            let a = [];
            if (e3) {
              let t3 = "", n2 = 0, i = false;
              const o = () => {
                if (!t3) throw new Error(`Formula contains function ${s} with invalid arguments ${e3}`);
                a.push(t3), t3 = "";
              };
              for (let s2 = 0; s2 < e3.length; ++s2) {
                const a2 = e3[s2];
                i ? (t3 += a2, a2 === i && (i = false)) : a2 in r2.literals && !n2 ? (t3 += a2, i = r2.literals[a2]) : "," !== a2 || n2 ? (t3 += a2, "(" === a2 ? ++n2 : ")" === a2 && --n2) : o();
              }
              o();
            }
            return a = a.map((e4) => new t2.Parser(e4, this.settings)), function(e4) {
              const t3 = [];
              for (const r3 of a) t3.push(r3.evaluate(e4));
              return n.call(e4, ...t3);
            };
          }
          evaluate(e3) {
            const t3 = this._parts.slice();
            for (let s = t3.length - 2; s >= 0; --s) {
              const n = t3[s];
              if (n && "operator" === n.type) {
                const a = t3[s + 1];
                t3.splice(s + 1, 1);
                const i = r2.evaluate(a, e3);
                t3[s] = r2.single(n.value, i);
              }
            }
            return r2.operatorsOrder.forEach((s) => {
              for (let n = 1; n < t3.length - 1; ) if (s.includes(t3[n])) {
                const s2 = t3[n], a = r2.evaluate(t3[n - 1], e3), i = r2.evaluate(t3[n + 1], e3);
                t3.splice(n, 2);
                const o = r2.calculate(s2, a, i);
                t3[n - 1] = 0 === o ? 0 : o;
              } else n += 2;
            }), r2.evaluate(t3[0], e3);
          }
        }, t2.Parser.prototype[r2.symbol] = true, r2.reference = function(e3) {
          return function(t3) {
            return t3 && void 0 !== t3[e3] ? t3[e3] : null;
          };
        }, r2.evaluate = function(e3, t3) {
          return null === e3 ? null : "function" == typeof e3 ? e3(t3) : e3[r2.symbol] ? e3.evaluate(t3) : e3;
        }, r2.single = function(e3, t3) {
          if ("!" === e3) return !t3;
          const r3 = -t3;
          return 0 === r3 ? 0 : r3;
        }, r2.calculate = function(e3, t3, s) {
          if ("??" === e3) return r2.exists(t3) ? t3 : s;
          if ("string" == typeof t3 || "string" == typeof s) {
            if ("+" === e3) return (t3 = r2.exists(t3) ? t3 : "") + (r2.exists(s) ? s : "");
          } else switch (e3) {
            case "^":
              return Math.pow(t3, s);
            case "*":
              return t3 * s;
            case "/":
              return t3 / s;
            case "%":
              return t3 % s;
            case "+":
              return t3 + s;
            case "-":
              return t3 - s;
          }
          switch (e3) {
            case "<":
              return t3 < s;
            case "<=":
              return t3 <= s;
            case ">":
              return t3 > s;
            case ">=":
              return t3 >= s;
            case "==":
              return t3 === s;
            case "!=":
              return t3 !== s;
            case "&&":
              return t3 && s;
            case "||":
              return t3 || s;
          }
          return null;
        }, r2.exists = function(e3) {
          return null != e3;
        };
      }, 6084(e2, t2, r2) {
        "use strict";
        const s = r2(8253), n = r2(4126), a = r2(9315), i = r2(1528), o = {};
        e2.exports = function(e3, t3, r3 = {}) {
          if (s(e3 && "object" == typeof e3, "Invalid defaults value: must be an object"), s(!t3 || true === t3 || "object" == typeof t3, "Invalid source value: must be true, falsy or an object"), s("object" == typeof r3, "Invalid options: must be an object"), !t3) return null;
          if (r3.shallow) return o.applyToDefaultsWithShallow(e3, t3, r3);
          const i2 = n(e3);
          if (true === t3) return i2;
          const l = void 0 !== r3.nullOverride && r3.nullOverride;
          return a(i2, t3, { nullOverride: l, mergeArrays: false });
        }, o.applyToDefaultsWithShallow = function(e3, t3, r3) {
          const l = r3.shallow;
          s(Array.isArray(l), "Invalid keys");
          const c = /* @__PURE__ */ new Map(), u = true === t3 ? null : /* @__PURE__ */ new Set();
          for (let r4 of l) {
            r4 = Array.isArray(r4) ? r4 : r4.split(".");
            const s2 = i(e3, r4);
            s2 && "object" == typeof s2 ? c.set(s2, u && i(t3, r4) || s2) : u && u.add(r4);
          }
          const f = n(e3, {}, c);
          if (!u) return f;
          for (const e4 of u) o.reachCopy(f, t3, e4);
          const m = void 0 !== r3.nullOverride && r3.nullOverride;
          return a(f, t3, { nullOverride: m, mergeArrays: false });
        }, o.reachCopy = function(e3, t3, r3) {
          for (const e4 of r3) {
            if (!(e4 in t3)) return;
            const r4 = t3[e4];
            if ("object" != typeof r4 || null === r4) return;
            t3 = r4;
          }
          const s2 = t3;
          let n2 = e3;
          for (let e4 = 0; e4 < r3.length - 1; ++e4) {
            const t4 = r3[e4];
            "object" != typeof n2[t4] && (n2[t4] = {}), n2 = n2[t4];
          }
          n2[r3[r3.length - 1]] = s2;
        };
      }, 8253(e2, t2, r2) {
        "use strict";
        const s = r2(1803), n = r2(8314), a = e2.exports = function(e3, ...t3) {
          if (e3) return;
          if (1 === t3.length && t3[0] instanceof Error) throw t3[0];
          const r3 = t3.filter((e4) => "" !== e4).map((e4) => "string" == typeof e4 ? e4 : e4 instanceof Error ? e4.message : n(e4));
          throw new s(r3.join(" "), a);
        };
      }, 1803(e2) {
        "use strict";
        e2.exports = class extends Error {
          constructor(e3, t2) {
            var r2, s, n;
            super(e3 || "Unknown error"), r2 = this, n = "AssertError", (s = (function(e4) {
              var t3 = (function(e5) {
                if ("object" != typeof e5 || !e5) return e5;
                var t4 = e5[Symbol.toPrimitive];
                if (void 0 !== t4) {
                  var r3 = t4.call(e5, "string");
                  if ("object" != typeof r3) return r3;
                  throw new TypeError("@@toPrimitive must return a primitive value.");
                }
                return String(e5);
              })(e4);
              return "symbol" == typeof t3 ? t3 : t3 + "";
            })(s = "name")) in r2 ? Object.defineProperty(r2, s, { value: n, enumerable: true, configurable: true, writable: true }) : r2[s] = n, "function" == typeof Error.captureStackTrace && Error.captureStackTrace(this, t2);
          }
        };
      }, 9145(e2) {
        "use strict";
        const t2 = {};
        e2.exports = t2.Bench = class {
          constructor() {
            this.ts = 0, this.reset();
          }
          reset() {
            this.ts = t2.Bench.now();
          }
          elapsed() {
            return t2.Bench.now() - this.ts;
          }
          static now() {
            const e3 = process.hrtime();
            return 1e3 * e3[0] + e3[1] / 1e6;
          }
        };
      }, 3386(e2, t2, r2) {
        "use strict";
        const s = r2(9725);
        e2.exports = function() {
          return new Promise(s);
        };
      }, 4126(e2, t2, r2) {
        "use strict";
        const s = r2(1528), n = r2(3738), a = r2(86), i = { needsProtoHack: /* @__PURE__ */ new Set([n.set, n.map, n.weakSet, n.weakMap]), structuredCloneExists: "function" == typeof structuredClone };
        e2.exports = i.clone = function(e3, t3 = {}, r3 = null) {
          if ("object" != typeof e3 || null === e3) return e3;
          let s2 = i.clone, o = r3;
          if (t3.shallow) {
            if (true !== t3.shallow) return i.cloneWithShallow(e3, t3);
            s2 = (e4) => e4;
          } else if (o) {
            const t4 = o.get(e3);
            if (t4) return t4;
          } else o = /* @__PURE__ */ new Map();
          const l = n.getInternalProto(e3);
          switch (l) {
            case n.buffer:
              return false ? void 0 : false.from(e3);
            case n.date:
              return new Date(e3.getTime());
            case n.regex:
            case n.url:
              return new l.constructor(e3);
          }
          const c = i.base(e3, l, t3);
          if (c === e3) return e3;
          if (o && o.set(e3, c), l === n.set) for (const r4 of e3) c.add(s2(r4, t3, o));
          else if (l === n.map) for (const [r4, n2] of e3) c.set(r4, s2(n2, t3, o));
          const u = a.keys(e3, t3);
          for (const r4 of u) {
            if ("__proto__" === r4) continue;
            if (l === n.array && "length" === r4) {
              c.length = e3.length;
              continue;
            }
            if (i.structuredCloneExists && l === n.error && "stack" === r4) continue;
            const a2 = Object.getOwnPropertyDescriptor(e3, r4);
            a2 ? a2.get || a2.set ? Object.defineProperty(c, r4, a2) : a2.enumerable ? c[r4] = s2(e3[r4], t3, o) : Object.defineProperty(c, r4, { enumerable: false, writable: true, configurable: true, value: s2(e3[r4], t3, o) }) : Object.defineProperty(c, r4, { enumerable: true, writable: true, configurable: true, value: s2(e3[r4], t3, o) });
          }
          return c;
        }, i.cloneWithShallow = function(e3, t3) {
          const r3 = t3.shallow;
          (t3 = Object.assign({}, t3)).shallow = false;
          const n2 = /* @__PURE__ */ new Map();
          for (const t4 of r3) {
            const r4 = s(e3, t4);
            "object" != typeof r4 && "function" != typeof r4 || n2.set(r4, r4);
          }
          return i.clone(e3, t3, n2);
        }, i.base = function(e3, t3, r3) {
          if (false === r3.prototype) return i.needsProtoHack.has(t3) ? new t3.constructor() : t3 === n.array ? [] : {};
          const s2 = Object.getPrototypeOf(e3);
          if (s2 && s2.isImmutable) return e3;
          if (t3 === n.array) {
            const e4 = [];
            return s2 !== t3 && Object.setPrototypeOf(e4, s2), e4;
          }
          if (t3 === n.error && i.structuredCloneExists && (s2 === t3 || Error.isPrototypeOf(s2.constructor))) {
            const t4 = structuredClone(e3);
            return Object.getPrototypeOf(t4) !== s2 && Object.setPrototypeOf(t4, s2), t4;
          }
          if (i.needsProtoHack.has(t3)) {
            const e4 = new s2.constructor();
            return s2 !== t3 && Object.setPrototypeOf(e4, s2), e4;
          }
          return Object.create(s2);
        };
      }, 2847(e2, t2, r2) {
        "use strict";
        const s = r2(8253), n = r2(7125), a = r2(8669), i = r2(86), o = {};
        e2.exports = function(e3, t3, r3 = {}) {
          return "object" != typeof t3 && (t3 = [t3]), s(!Array.isArray(t3) || t3.length, "Values array cannot be empty"), "string" == typeof e3 ? o.string(e3, t3, r3) : Array.isArray(e3) ? o.array(e3, t3, r3) : (s("object" == typeof e3, "Reference must be string or an object"), o.object(e3, t3, r3));
        }, o.array = function(e3, t3, r3) {
          if (Array.isArray(t3) || (t3 = [t3]), !e3.length) return false;
          if (r3.only && r3.once && e3.length !== t3.length) return false;
          let s2;
          const n2 = /* @__PURE__ */ new Map();
          for (const e4 of t3) if (r3.deep && e4 && "object" == typeof e4) {
            s2 = null != s2 ? s2 : o.compare(r3);
            let t4 = false;
            for (const [r4, a3] of n2.entries()) if (s2(r4, e4)) {
              ++a3.allowed, t4 = true;
              break;
            }
            t4 || n2.set(e4, { allowed: 1, hits: 0 });
          } else {
            const t4 = n2.get(e4);
            t4 ? ++t4.allowed : n2.set(e4, { allowed: 1, hits: 0 });
          }
          let a2 = 0;
          for (const t4 of e3) {
            let e4;
            if (r3.deep && t4 && "object" == typeof t4) {
              s2 = null != s2 ? s2 : o.compare(r3);
              for (const [r4, a3] of n2.entries()) if (s2(r4, t4)) {
                e4 = a3;
                break;
              }
            } else e4 = n2.get(t4);
            if (e4 && (++e4.hits, ++a2, r3.once && e4.hits > e4.allowed)) return false;
          }
          if (r3.only && a2 !== e3.length) return false;
          for (const e4 of n2.values()) if (e4.hits !== e4.allowed && e4.hits < e4.allowed && !r3.part) return false;
          return !!a2;
        }, o.object = function(e3, t3, r3) {
          s(void 0 === r3.once, "Cannot use option once with object");
          const n2 = i.keys(e3, r3);
          if (!n2.length) return false;
          if (Array.isArray(t3)) return o.array(n2, t3, r3);
          const a2 = Object.getOwnPropertySymbols(t3).filter((e4) => t3.propertyIsEnumerable(e4)), l = [...Object.keys(t3), ...a2], c = o.compare(r3), u = new Set(l);
          for (const s2 of n2) if (u.has(s2)) {
            if (!c(t3[s2], e3[s2])) return false;
            u.delete(s2);
          } else if (r3.only) return false;
          return !u.size || !!r3.part && u.size < l.length;
        }, o.string = function(e3, t3, r3) {
          if ("" === e3) return 1 === t3.length && "" === t3[0] || !r3.once && !t3.some((e4) => "" !== e4);
          const n2 = /* @__PURE__ */ new Map(), i2 = [];
          for (const e4 of t3) if (s("string" == typeof e4, "Cannot compare string reference to non-string value"), e4) {
            const t4 = n2.get(e4);
            t4 ? ++t4.allowed : (n2.set(e4, { allowed: 1, hits: 0 }), i2.push(a(e4)));
          } else if (r3.once || r3.only) return false;
          if (!i2.length) return true;
          const o2 = new RegExp(`(${i2.join("|")})`, "g"), l = e3.replace(o2, (e4, t4) => (++n2.get(t4).hits, ""));
          if (r3.only && l) return false;
          let c = false;
          for (const e4 of n2.values()) if (e4.hits && (c = true), e4.hits !== e4.allowed) {
            if (e4.hits < e4.allowed && !r3.part) return false;
            if (r3.once) return false;
          }
          return !!c;
        }, o.compare = function(e3) {
          if (!e3.deep) return o.shallow;
          const t3 = void 0 !== e3.only, r3 = void 0 !== e3.part, s2 = { prototype: t3 ? e3.only : !!r3 && !e3.part, part: t3 ? !e3.only : !!r3 && e3.part };
          return (e4, t4) => n(e4, t4, s2);
        }, o.shallow = function(e3, t3) {
          return e3 === t3;
        };
      }, 7125(e2, t2, r2) {
        "use strict";
        const s = r2(3738), n = { mismatched: null };
        e2.exports = function(e3, t3, r3) {
          return r3 = Object.assign({ prototype: true }, r3), !!n.isDeepEqual(e3, t3, r3, []);
        }, n.isDeepEqual = function(e3, t3, r3, a) {
          if (e3 === t3) return 0 !== e3 || 1 / e3 == 1 / t3;
          const i = typeof e3;
          if (i !== typeof t3) return false;
          if (null === e3 || null === t3) return false;
          if ("function" === i) {
            if (!r3.deepFunction || e3.toString() !== t3.toString()) return false;
          } else if ("object" !== i) return e3 != e3 && t3 != t3;
          const o = n.getSharedType(e3, t3, !!r3.prototype);
          switch (o) {
            case s.buffer:
              return false;
            case s.promise:
              return e3 === t3;
            case s.regex:
            case s.url:
              return e3.toString() === t3.toString();
            case n.mismatched:
              return false;
          }
          for (let r4 = a.length - 1; r4 >= 0; --r4) if (a[r4].isSame(e3, t3)) return true;
          a.push(new n.SeenEntry(e3, t3));
          try {
            return !!n.isDeepEqualObj(o, e3, t3, r3, a);
          } finally {
            a.pop();
          }
        }, n.getSharedType = function(e3, t3, r3) {
          if (r3) return Object.getPrototypeOf(e3) !== Object.getPrototypeOf(t3) ? n.mismatched : s.getInternalProto(e3);
          const a = s.getInternalProto(e3);
          return a !== s.getInternalProto(t3) ? n.mismatched : a;
        }, n.valueOf = function(e3) {
          const t3 = e3.valueOf;
          if (void 0 === t3) return e3;
          try {
            return t3.call(e3);
          } catch (e4) {
            return e4;
          }
        }, n.hasOwnEnumerableProperty = function(e3, t3) {
          return Object.prototype.propertyIsEnumerable.call(e3, t3);
        }, n.isSetSimpleEqual = function(e3, t3) {
          for (const r3 of Set.prototype.values.call(e3)) if (!Set.prototype.has.call(t3, r3)) return false;
          return true;
        }, n.isDeepEqualObj = function(e3, t3, r3, a, i) {
          const { isDeepEqual: o, valueOf: l, hasOwnEnumerableProperty: c } = n, { keys: u, getOwnPropertySymbols: f } = Object;
          if (e3 === s.array) {
            if (!a.part) {
              if (t3.length !== r3.length) return false;
              for (let e4 = 0; e4 < t3.length; ++e4) if (!o(t3[e4], r3[e4], a, i)) return false;
              return true;
            }
            for (const e4 of t3) for (const t4 of r3) if (o(e4, t4, a, i)) return true;
          } else if (e3 === s.set) {
            if (t3.size !== r3.size) return false;
            if (!n.isSetSimpleEqual(t3, r3)) {
              const e4 = new Set(Set.prototype.values.call(r3));
              for (const r4 of Set.prototype.values.call(t3)) {
                if (e4.delete(r4)) continue;
                let t4 = false;
                for (const s2 of e4) if (o(r4, s2, a, i)) {
                  e4.delete(s2), t4 = true;
                  break;
                }
                if (!t4) return false;
              }
            }
          } else if (e3 === s.map) {
            if (t3.size !== r3.size) return false;
            for (const [e4, s2] of Map.prototype.entries.call(t3)) {
              if (void 0 === s2 && !Map.prototype.has.call(r3, e4)) return false;
              if (!o(s2, Map.prototype.get.call(r3, e4), a, i)) return false;
            }
          } else if (e3 === s.error && (t3.name !== r3.name || t3.message !== r3.message)) return false;
          const m = l(t3), h = l(r3);
          if ((t3 !== m || r3 !== h) && !o(m, h, a, i)) return false;
          const p = u(t3);
          if (!a.part && p.length !== u(r3).length && !a.skip) return false;
          let d = 0;
          for (const e4 of p) if (a.skip && a.skip.includes(e4)) void 0 === r3[e4] && ++d;
          else {
            if (!c(r3, e4)) return false;
            if (!o(t3[e4], r3[e4], a, i)) return false;
          }
          if (!a.part && p.length - d !== u(r3).length) return false;
          if (false !== a.symbols) {
            const e4 = f(t3), s2 = new Set(f(r3));
            for (const n2 of e4) {
              var g;
              if (null === (g = a.skip) || void 0 === g || !g.includes(n2)) {
                if (c(t3, n2)) {
                  if (!c(r3, n2)) return false;
                  if (!o(t3[n2], r3[n2], a, i)) return false;
                } else if (c(r3, n2)) return false;
              }
              s2.delete(n2);
            }
            for (const e5 of s2) if (c(r3, e5)) return false;
          }
          return true;
        }, n.SeenEntry = class {
          constructor(e3, t3) {
            this.obj = e3, this.ref = t3;
          }
          isSame(e3, t3) {
            return this.obj === e3 && this.ref === t3;
          }
        };
      }, 9241(e2, t2, r2) {
        "use strict";
        const s = r2(8253);
        e2.exports = function(e3) {
          return s(/^[ \w\!#\$%&'\(\)\*\+,\-\.\/\:;<\=>\?@\[\]\^`\{\|\}~\"\\]*$/.test(e3), "Bad attribute value (" + e3 + ")"), e3.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
        };
      }, 8121(e2) {
        "use strict";
        const t2 = {};
        e2.exports = function(e3) {
          if (!e3) return "";
          let r2 = "";
          for (let s = 0; s < e3.length; ++s) {
            const n = e3.charCodeAt(s);
            t2.isSafe(n) ? r2 += e3[s] : r2 += t2.escapeHtmlChar(n);
          }
          return r2;
        }, t2.escapeHtmlChar = function(e3) {
          const r2 = t2.namedHtml.get(e3);
          return r2 || (e3 >= 256 ? "&#" + e3 + ";" : `&#x${e3.toString(16).padStart(2, "0")};`);
        }, t2.isSafe = function(e3) {
          return t2.safeCharCodes.has(e3);
        }, t2.namedHtml = /* @__PURE__ */ new Map([[38, "&amp;"], [60, "&lt;"], [62, "&gt;"], [34, "&quot;"], [160, "&nbsp;"], [162, "&cent;"], [163, "&pound;"], [164, "&curren;"], [169, "&copy;"], [174, "&reg;"]]), t2.safeCharCodes = (function() {
          const e3 = /* @__PURE__ */ new Set();
          for (let t3 = 32; t3 < 123; ++t3) (t3 >= 97 || t3 >= 65 && t3 <= 90 || t3 >= 48 && t3 <= 57 || 32 === t3 || 46 === t3 || 44 === t3 || 45 === t3 || 58 === t3 || 95 === t3) && e3.add(t3);
          return e3;
        })();
      }, 5570(e2) {
        "use strict";
        const t2 = {};
        e2.exports = function(e3) {
          return e3 ? e3.replace(/[<>&\u2028\u2029]/g, t2.escape) : "";
        }, t2.escape = function(e3) {
          return t2.replacements.get(e3);
        }, t2.replacements = /* @__PURE__ */ new Map([["<", "\\u003c"], [">", "\\u003e"], ["&", "\\u0026"], ["\u2028", "\\u2028"], ["\u2029", "\\u2029"]]);
      }, 8669(e2) {
        "use strict";
        e2.exports = function(e3) {
          return e3.replace(/[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g, "\\$&");
        };
      }, 5553(e2) {
        "use strict";
        const t2 = {};
        e2.exports = t2.flatten = function(e3, r2) {
          const s = r2 || [];
          for (const r3 of e3) Array.isArray(r3) ? t2.flatten(r3, s) : s.push(r3);
          return s;
        };
      }, 9725(e2) {
        "use strict";
        e2.exports = function() {
        };
      }, 3115(e2, t2, r2) {
        "use strict";
        t2.applyToDefaults = r2(6084), t2.assert = r2(8253), t2.AssertError = r2(1803), r2(9145), r2(3386), t2.clone = r2(4126), r2(2847), t2.deepEqual = r2(7125), r2(9241), t2.escapeHtml = r2(8121), r2(5570), t2.escapeRegex = r2(8669), r2(5553), t2.ignore = r2(9725), r2(3110), r2(834), t2.merge = r2(9315), r2(8762), t2.reach = r2(1528), r2(1626), r2(8314), r2(7858);
      }, 3110(e2) {
        "use strict";
        const t2 = {};
        e2.exports = function(e3, r2, s = {}) {
          if (!e3 || !r2) return s.first ? null : [];
          const n = [], a = Array.isArray(e3) ? new Set(e3) : e3, i = /* @__PURE__ */ new Set();
          for (const e4 of r2) if (t2.has(a, e4) && !i.has(e4)) {
            if (s.first) return e4;
            n.push(e4), i.add(e4);
          }
          return s.first ? null : n;
        }, t2.has = function(e3, t3) {
          return "function" == typeof e3.has ? e3.has(t3) : void 0 !== e3[t3];
        };
      }, 834(e2) {
        "use strict";
        e2.exports = function(e3) {
          return "function" == typeof (null == e3 ? void 0 : e3.then);
        };
      }, 9315(e2, t2, r2) {
        "use strict";
        const s = r2(8253), n = r2(4126), a = r2(86), i = {};
        e2.exports = i.merge = function(e3, t3, r3) {
          if (s(e3 && "object" == typeof e3, "Invalid target value: must be an object"), s(null == t3 || "object" == typeof t3, "Invalid source value: must be null, undefined, or an object"), !t3) return e3;
          if (r3 = Object.assign({ nullOverride: true, mergeArrays: true }, r3), Array.isArray(t3)) {
            s(Array.isArray(e3), "Cannot merge array onto an object"), r3.mergeArrays || (e3.length = 0);
            for (let s2 = 0; s2 < t3.length; ++s2) e3.push(n(t3[s2], { symbols: r3.symbols }));
            return e3;
          }
          const o = a.keys(t3, r3);
          for (let s2 = 0; s2 < o.length; ++s2) {
            const a2 = o[s2];
            if ("__proto__" === a2 || !Object.prototype.propertyIsEnumerable.call(t3, a2)) continue;
            const l = t3[a2];
            if (l && "object" == typeof l) {
              if (e3[a2] === l) continue;
              !e3[a2] || "object" != typeof e3[a2] || Array.isArray(e3[a2]) !== Array.isArray(l) || l instanceof Date || l instanceof RegExp ? e3[a2] = n(l, { symbols: r3.symbols }) : i.merge(e3[a2], l, r3);
            } else (null != l || r3.nullOverride) && (e3[a2] = l);
          }
          return e3;
        };
      }, 8762(e2) {
        "use strict";
        const t2 = /* @__PURE__ */ Symbol("wrapped");
        e2.exports = function(e3) {
          if (e3[t2]) return e3;
          let r2 = false;
          const s = function(...t3) {
            r2 || (r2 = true, e3(...t3));
          };
          return s[t2] = true, s;
        };
      }, 1528(e2, t2, r2) {
        "use strict";
        const s = r2(8253), n = {};
        e2.exports = function(e3, t3, r3) {
          if (false === t3 || null == t3) return e3;
          "string" == typeof (r3 = r3 || {}) && (r3 = { separator: r3 });
          const a = Array.isArray(t3);
          s(!a || !r3.separator, "Separator option is not valid for array-based chain");
          const i = a ? t3 : t3.split(r3.separator || ".");
          let o = e3;
          for (let e4 = 0; e4 < i.length; ++e4) {
            let a2 = i[e4];
            const l = r3.iterables && n.iterables(o);
            if (Array.isArray(o) || "set" === l) {
              const e5 = Number(a2);
              Number.isInteger(e5) && (a2 = e5 < 0 ? o.length + e5 : e5);
            }
            if (!o || "function" == typeof o && false === r3.functions || !l && void 0 === o[a2]) {
              s(!r3.strict || e4 + 1 === i.length, "Missing segment", a2, "in reach path ", t3), s("object" == typeof o || true === r3.functions || "function" != typeof o, "Invalid segment", a2, "in reach path ", t3), o = r3.default;
              break;
            }
            o = l ? "set" === l ? [...o][a2] : o.get(a2) : o[a2];
          }
          return o;
        }, n.iterables = function(e3) {
          return e3 instanceof Set ? "set" : e3 instanceof Map ? "map" : void 0;
        };
      }, 1626(e2, t2, r2) {
        "use strict";
        const s = r2(1528);
        e2.exports = function(e3, t3, r3) {
          return t3.replace(/{([^{}]+)}/g, (t4, n) => {
            const a = s(e3, n, r3);
            return null != a ? a : "";
          });
        };
      }, 8314(e2) {
        "use strict";
        e2.exports = function(...e3) {
          try {
            return JSON.stringify(...e3);
          } catch (e4) {
            return "[Cannot display object: " + e4.message + "]";
          }
        };
      }, 3738(e2, t2) {
        "use strict";
        const r2 = {};
        t2 = e2.exports = { array: Array.prototype, buffer: false, date: Date.prototype, error: Error.prototype, generic: Object.prototype, map: Map.prototype, promise: Promise.prototype, regex: RegExp.prototype, set: Set.prototype, url: URL.prototype, weakMap: WeakMap.prototype, weakSet: WeakSet.prototype }, r2.typeMap = /* @__PURE__ */ new Map([["[object Error]", t2.error], ["[object Map]", t2.map], ["[object Promise]", t2.promise], ["[object Set]", t2.set], ["[object URL]", t2.url], ["[object WeakMap]", t2.weakMap], ["[object WeakSet]", t2.weakSet]]), t2.getInternalProto = function(e3) {
          if (Array.isArray(e3)) return t2.array;
          if (e3 instanceof Date) return t2.date;
          if (e3 instanceof RegExp) return t2.regex;
          if (e3 instanceof Error) return t2.error;
          const s = Object.prototype.toString.call(e3);
          return r2.typeMap.get(s) || t2.generic;
        };
      }, 86(e2, t2) {
        "use strict";
        t2.keys = function(e3, t3 = {}) {
          return false !== t3.symbols ? Reflect.ownKeys(e3) : Object.getOwnPropertyNames(e3);
        };
      }, 7858(e2) {
        "use strict";
        e2.exports = function(e3, t2, r2) {
          if ("bigint" == typeof e3 && (e3 = Number(e3)), e3 >= Number.MAX_SAFE_INTEGER && (e3 = 1 / 0), "number" != typeof e3 && void 0 !== e3) throw new TypeError("Timeout must be a number or bigint");
          return new Promise((s) => {
            const n = r2 ? r2.setTimeout : setTimeout, a = () => {
              const r3 = Math.min(e3, 2147483647);
              e3 -= r3, n(() => e3 > 0 ? a() : s(t2), r3);
            };
            e3 !== 1 / 0 && a();
          });
        };
      }, 8248(e2, t2, r2) {
        "use strict";
        const { assert: s } = r2(3115), n = {};
        t2.Sorter = class {
          constructor() {
            this._items = [], this.nodes = [];
          }
          add(e3, t3) {
            var r3, n2, a, i;
            const o = [].concat(null !== (r3 = (t3 = null != t3 ? t3 : {}).before) && void 0 !== r3 ? r3 : []), l = [].concat(null !== (n2 = t3.after) && void 0 !== n2 ? n2 : []), c = null !== (a = t3.group) && void 0 !== a ? a : "?", u = null !== (i = t3.sort) && void 0 !== i ? i : 0;
            s(!o.includes(c), `Item cannot come before itself: ${c}`), s(!o.includes("?"), "Item cannot come before unassociated items"), s(!l.includes(c), `Item cannot come after itself: ${c}`), s(!l.includes("?"), "Item cannot come after unassociated items"), Array.isArray(e3) || (e3 = [e3]);
            for (const t4 of e3) {
              const e4 = { seq: this._items.length, sort: u, before: o, after: l, group: c, node: t4 };
              this._items.push(e4);
            }
            if (!t3.manual) {
              const e4 = this._sort();
              s(e4, "item", "?" !== c ? `added into group ${c}` : "", "created a dependencies error");
            }
            return this.nodes;
          }
          merge(e3) {
            Array.isArray(e3) || (e3 = [e3]);
            for (const t4 of e3) if (t4) for (const e4 of t4._items) this._items.push(Object.assign({}, e4));
            this._items.sort(n.mergeSort);
            for (let e4 = 0; e4 < this._items.length; ++e4) this._items[e4].seq = e4;
            const t3 = this._sort();
            return s(t3, "merge created a dependencies error"), this.nodes;
          }
          sort() {
            const e3 = this._sort();
            return s(e3, "sort created a dependencies error"), this.nodes;
          }
          _sort() {
            const e3 = {}, t3 = /* @__PURE__ */ Object.create(null), r3 = /* @__PURE__ */ Object.create(null);
            for (const a2 of this._items) {
              var s2;
              const i2 = a2.seq, o2 = a2.group;
              r3[o2] = null !== (s2 = r3[o2]) && void 0 !== s2 ? s2 : [], r3[o2].push(i2), e3[i2] = a2.before;
              for (const e4 of a2.after) {
                var n2;
                t3[e4] = null !== (n2 = t3[e4]) && void 0 !== n2 ? n2 : [], t3[e4].push(i2);
              }
            }
            for (const t4 in e3) {
              const s3 = [];
              for (const n3 in e3[t4]) {
                var a;
                const i2 = e3[t4][n3];
                r3[i2] = null !== (a = r3[i2]) && void 0 !== a ? a : [], s3.push(...r3[i2]);
              }
              e3[t4] = s3;
            }
            for (const s3 in t3) if (r3[s3]) for (const n3 of r3[s3]) e3[n3].push(...t3[s3]);
            const i = {};
            for (const t4 in e3) {
              const r4 = e3[t4];
              for (const e4 of r4) {
                var o;
                i[e4] = null !== (o = i[e4]) && void 0 !== o ? o : [], i[e4].push(t4);
              }
            }
            const l = {}, c = [];
            for (let e4 = 0; e4 < this._items.length; ++e4) {
              let t4 = e4;
              if (i[e4]) {
                t4 = null;
                for (let e5 = 0; e5 < this._items.length; ++e5) {
                  if (true === l[e5]) continue;
                  i[e5] || (i[e5] = []);
                  const r4 = i[e5].length;
                  let s3 = 0;
                  for (let t5 = 0; t5 < r4; ++t5) l[i[e5][t5]] && ++s3;
                  if (s3 === r4) {
                    t4 = e5;
                    break;
                  }
                }
              }
              null !== t4 && (l[t4] = true, c.push(t4));
            }
            if (c.length !== this._items.length) return false;
            const u = {};
            for (const e4 of this._items) u[e4.seq] = e4;
            this._items = [], this.nodes = [];
            for (const e4 of c) {
              const t4 = u[e4];
              this.nodes.push(t4.node), this._items.push(t4);
            }
            return true;
          }
        }, n.mergeSort = (e3, t3) => e3.sort === t3.sort ? 0 : e3.sort < t3.sort ? -1 : 1;
      }, 554() {
      }, 9017() {
      }, 125() {
      }, 8663() {
      }, 6984() {
      }, 1339(e2, t2, r2) {
        "use strict";
        Object.defineProperty(t2, "__esModule", { value: true }), t2.tlds = void 0;
        const s = r2(1838);
        t2.tlds = new Set(s.TLDS.map((e3) => e3.toLowerCase()));
      }, 1838(e2, t2) {
        "use strict";
        Object.defineProperty(t2, "__esModule", { value: true }), t2.TLDS = void 0, t2.TLDS = ["AAA", "AARP", "ABB", "ABBOTT", "ABBVIE", "ABC", "ABLE", "ABOGADO", "ABUDHABI", "AC", "ACADEMY", "ACCENTURE", "ACCOUNTANT", "ACCOUNTANTS", "ACO", "ACTOR", "AD", "ADS", "ADULT", "AE", "AEG", "AERO", "AETNA", "AF", "AFL", "AFRICA", "AG", "AGAKHAN", "AGENCY", "AI", "AIG", "AIRBUS", "AIRFORCE", "AIRTEL", "AKDN", "AL", "ALIBABA", "ALIPAY", "ALLFINANZ", "ALLSTATE", "ALLY", "ALSACE", "ALSTOM", "AM", "AMAZON", "AMERICANEXPRESS", "AMERICANFAMILY", "AMEX", "AMFAM", "AMICA", "AMSTERDAM", "ANALYTICS", "ANDROID", "ANQUAN", "ANZ", "AO", "AOL", "APARTMENTS", "APP", "APPLE", "AQ", "AQUARELLE", "AR", "ARAB", "ARAMCO", "ARCHI", "ARMY", "ARPA", "ART", "ARTE", "AS", "ASDA", "ASIA", "ASSOCIATES", "AT", "ATHLETA", "ATTORNEY", "AU", "AUCTION", "AUDI", "AUDIBLE", "AUDIO", "AUSPOST", "AUTHOR", "AUTO", "AUTOS", "AW", "AWS", "AX", "AXA", "AZ", "AZURE", "BA", "BABY", "BAIDU", "BANAMEX", "BAND", "BANK", "BAR", "BARCELONA", "BARCLAYCARD", "BARCLAYS", "BAREFOOT", "BARGAINS", "BASEBALL", "BASKETBALL", "BAUHAUS", "BAYERN", "BB", "BBC", "BBT", "BBVA", "BCG", "BCN", "BD", "BE", "BEATS", "BEAUTY", "BEER", "BERLIN", "BEST", "BESTBUY", "BET", "BF", "BG", "BH", "BHARTI", "BI", "BIBLE", "BID", "BIKE", "BING", "BINGO", "BIO", "BIZ", "BJ", "BLACK", "BLACKFRIDAY", "BLOCKBUSTER", "BLOG", "BLOOMBERG", "BLUE", "BM", "BMS", "BMW", "BN", "BNPPARIBAS", "BO", "BOATS", "BOEHRINGER", "BOFA", "BOM", "BOND", "BOO", "BOOK", "BOOKING", "BOSCH", "BOSTIK", "BOSTON", "BOT", "BOUTIQUE", "BOX", "BR", "BRADESCO", "BRIDGESTONE", "BROADWAY", "BROKER", "BROTHER", "BRUSSELS", "BS", "BT", "BUILD", "BUILDERS", "BUSINESS", "BUY", "BUZZ", "BV", "BW", "BY", "BZ", "BZH", "CA", "CAB", "CAFE", "CAL", "CALL", "CALVINKLEIN", "CAM", "CAMERA", "CAMP", "CANON", "CAPETOWN", "CAPITAL", "CAPITALONE", "CAR", "CARAVAN", "CARDS", "CARE", "CAREER", "CAREERS", "CARS", "CASA", "CASE", "CASH", "CASINO", "CAT", "CATERING", "CATHOLIC", "CBA", "CBN", "CBRE", "CC", "CD", "CENTER", "CEO", "CERN", "CF", "CFA", "CFD", "CG", "CH", "CHANEL", "CHANNEL", "CHARITY", "CHASE", "CHAT", "CHEAP", "CHINTAI", "CHRISTMAS", "CHROME", "CHURCH", "CI", "CIPRIANI", "CIRCLE", "CISCO", "CITADEL", "CITI", "CITIC", "CITY", "CK", "CL", "CLAIMS", "CLEANING", "CLICK", "CLINIC", "CLINIQUE", "CLOTHING", "CLOUD", "CLUB", "CLUBMED", "CM", "CN", "CO", "COACH", "CODES", "COFFEE", "COLLEGE", "COLOGNE", "COM", "COMMBANK", "COMMUNITY", "COMPANY", "COMPARE", "COMPUTER", "COMSEC", "CONDOS", "CONSTRUCTION", "CONSULTING", "CONTACT", "CONTRACTORS", "COOKING", "COOL", "COOP", "CORSICA", "COUNTRY", "COUPON", "COUPONS", "COURSES", "CPA", "CR", "CREDIT", "CREDITCARD", "CREDITUNION", "CRICKET", "CROWN", "CRS", "CRUISE", "CRUISES", "CU", "CUISINELLA", "CV", "CW", "CX", "CY", "CYMRU", "CYOU", "CZ", "DAD", "DANCE", "DATA", "DATE", "DATING", "DATSUN", "DAY", "DCLK", "DDS", "DE", "DEAL", "DEALER", "DEALS", "DEGREE", "DELIVERY", "DELL", "DELOITTE", "DELTA", "DEMOCRAT", "DENTAL", "DENTIST", "DESI", "DESIGN", "DEV", "DHL", "DIAMONDS", "DIET", "DIGITAL", "DIRECT", "DIRECTORY", "DISCOUNT", "DISCOVER", "DISH", "DIY", "DJ", "DK", "DM", "DNP", "DO", "DOCS", "DOCTOR", "DOG", "DOMAINS", "DOT", "DOWNLOAD", "DRIVE", "DTV", "DUBAI", "DUPONT", "DURBAN", "DVAG", "DVR", "DZ", "EARTH", "EAT", "EC", "ECO", "EDEKA", "EDU", "EDUCATION", "EE", "EG", "EMAIL", "EMERCK", "ENERGY", "ENGINEER", "ENGINEERING", "ENTERPRISES", "EPSON", "EQUIPMENT", "ER", "ERICSSON", "ERNI", "ES", "ESQ", "ESTATE", "ET", "EU", "EUROVISION", "EUS", "EVENTS", "EXCHANGE", "EXPERT", "EXPOSED", "EXPRESS", "EXTRASPACE", "FAGE", "FAIL", "FAIRWINDS", "FAITH", "FAMILY", "FAN", "FANS", "FARM", "FARMERS", "FASHION", "FAST", "FEDEX", "FEEDBACK", "FERRARI", "FERRERO", "FI", "FIDELITY", "FIDO", "FILM", "FINAL", "FINANCE", "FINANCIAL", "FIRE", "FIRESTONE", "FIRMDALE", "FISH", "FISHING", "FIT", "FITNESS", "FJ", "FK", "FLICKR", "FLIGHTS", "FLIR", "FLORIST", "FLOWERS", "FLY", "FM", "FO", "FOO", "FOOD", "FOOTBALL", "FORD", "FOREX", "FORSALE", "FORUM", "FOUNDATION", "FOX", "FR", "FREE", "FRESENIUS", "FRL", "FROGANS", "FRONTIER", "FTR", "FUJITSU", "FUN", "FUND", "FURNITURE", "FUTBOL", "FYI", "GA", "GAL", "GALLERY", "GALLO", "GALLUP", "GAME", "GAMES", "GAP", "GARDEN", "GAY", "GB", "GBIZ", "GD", "GDN", "GE", "GEA", "GENT", "GENTING", "GEORGE", "GF", "GG", "GGEE", "GH", "GI", "GIFT", "GIFTS", "GIVES", "GIVING", "GL", "GLASS", "GLE", "GLOBAL", "GLOBO", "GM", "GMAIL", "GMBH", "GMO", "GMX", "GN", "GODADDY", "GOLD", "GOLDPOINT", "GOLF", "GOODYEAR", "GOOG", "GOOGLE", "GOP", "GOT", "GOV", "GP", "GQ", "GR", "GRAINGER", "GRAPHICS", "GRATIS", "GREEN", "GRIPE", "GROCERY", "GROUP", "GS", "GT", "GU", "GUCCI", "GUGE", "GUIDE", "GUITARS", "GURU", "GW", "GY", "HAIR", "HAMBURG", "HANGOUT", "HAUS", "HBO", "HDFC", "HDFCBANK", "HEALTH", "HEALTHCARE", "HELP", "HELSINKI", "HERE", "HERMES", "HIPHOP", "HISAMITSU", "HITACHI", "HIV", "HK", "HKT", "HM", "HN", "HOCKEY", "HOLDINGS", "HOLIDAY", "HOMEDEPOT", "HOMEGOODS", "HOMES", "HOMESENSE", "HONDA", "HORSE", "HOSPITAL", "HOST", "HOSTING", "HOT", "HOTELS", "HOTMAIL", "HOUSE", "HOW", "HR", "HSBC", "HT", "HU", "HUGHES", "HYATT", "HYUNDAI", "IBM", "ICBC", "ICE", "ICU", "ID", "IE", "IEEE", "IFM", "IKANO", "IL", "IM", "IMAMAT", "IMDB", "IMMO", "IMMOBILIEN", "IN", "INC", "INDUSTRIES", "INFINITI", "INFO", "ING", "INK", "INSTITUTE", "INSURANCE", "INSURE", "INT", "INTERNATIONAL", "INTUIT", "INVESTMENTS", "IO", "IPIRANGA", "IQ", "IR", "IRISH", "IS", "ISMAILI", "IST", "ISTANBUL", "IT", "ITAU", "ITV", "JAGUAR", "JAVA", "JCB", "JE", "JEEP", "JETZT", "JEWELRY", "JIO", "JLL", "JM", "JMP", "JNJ", "JO", "JOBS", "JOBURG", "JOT", "JOY", "JP", "JPMORGAN", "JPRS", "JUEGOS", "JUNIPER", "KAUFEN", "KDDI", "KE", "KERRYHOTELS", "KERRYPROPERTIES", "KFH", "KG", "KH", "KI", "KIA", "KIDS", "KIM", "KINDLE", "KITCHEN", "KIWI", "KM", "KN", "KOELN", "KOMATSU", "KOSHER", "KP", "KPMG", "KPN", "KR", "KRD", "KRED", "KUOKGROUP", "KW", "KY", "KYOTO", "KZ", "LA", "LACAIXA", "LAMBORGHINI", "LAMER", "LAND", "LANDROVER", "LANXESS", "LASALLE", "LAT", "LATINO", "LATROBE", "LAW", "LAWYER", "LB", "LC", "LDS", "LEASE", "LECLERC", "LEFRAK", "LEGAL", "LEGO", "LEXUS", "LGBT", "LI", "LIDL", "LIFE", "LIFEINSURANCE", "LIFESTYLE", "LIGHTING", "LIKE", "LILLY", "LIMITED", "LIMO", "LINCOLN", "LINK", "LIVE", "LIVING", "LK", "LLC", "LLP", "LOAN", "LOANS", "LOCKER", "LOCUS", "LOL", "LONDON", "LOTTE", "LOTTO", "LOVE", "LPL", "LPLFINANCIAL", "LR", "LS", "LT", "LTD", "LTDA", "LU", "LUNDBECK", "LUXE", "LUXURY", "LV", "LY", "MA", "MADRID", "MAIF", "MAISON", "MAKEUP", "MAN", "MANAGEMENT", "MANGO", "MAP", "MARKET", "MARKETING", "MARKETS", "MARRIOTT", "MARSHALLS", "MATTEL", "MBA", "MC", "MCKINSEY", "MD", "ME", "MED", "MEDIA", "MEET", "MELBOURNE", "MEME", "MEMORIAL", "MEN", "MENU", "MERCKMSD", "MG", "MH", "MIAMI", "MICROSOFT", "MIL", "MINI", "MINT", "MIT", "MITSUBISHI", "MK", "ML", "MLB", "MLS", "MM", "MMA", "MN", "MO", "MOBI", "MOBILE", "MODA", "MOE", "MOI", "MOM", "MONASH", "MONEY", "MONSTER", "MORMON", "MORTGAGE", "MOSCOW", "MOTO", "MOTORCYCLES", "MOV", "MOVIE", "MP", "MQ", "MR", "MS", "MSD", "MT", "MTN", "MTR", "MU", "MUSEUM", "MUSIC", "MV", "MW", "MX", "MY", "MZ", "NA", "NAB", "NAGOYA", "NAME", "NAVY", "NBA", "NC", "NE", "NEC", "NET", "NETBANK", "NETFLIX", "NETWORK", "NEUSTAR", "NEW", "NEWS", "NEXT", "NEXTDIRECT", "NEXUS", "NF", "NFL", "NG", "NGO", "NHK", "NI", "NICO", "NIKE", "NIKON", "NINJA", "NISSAN", "NISSAY", "NL", "NO", "NOKIA", "NORTON", "NOW", "NOWRUZ", "NOWTV", "NP", "NR", "NRA", "NRW", "NTT", "NU", "NYC", "NZ", "OBI", "OBSERVER", "OFFICE", "OKINAWA", "OLAYAN", "OLAYANGROUP", "OLLO", "OM", "OMEGA", "ONE", "ONG", "ONL", "ONLINE", "OOO", "OPEN", "ORACLE", "ORANGE", "ORG", "ORGANIC", "ORIGINS", "OSAKA", "OTSUKA", "OTT", "OVH", "PA", "PAGE", "PANASONIC", "PARIS", "PARS", "PARTNERS", "PARTS", "PARTY", "PAY", "PCCW", "PE", "PET", "PF", "PFIZER", "PG", "PH", "PHARMACY", "PHD", "PHILIPS", "PHONE", "PHOTO", "PHOTOGRAPHY", "PHOTOS", "PHYSIO", "PICS", "PICTET", "PICTURES", "PID", "PIN", "PING", "PINK", "PIONEER", "PIZZA", "PK", "PL", "PLACE", "PLAY", "PLAYSTATION", "PLUMBING", "PLUS", "PM", "PN", "PNC", "POHL", "POKER", "POLITIE", "PORN", "POST", "PR", "PRAXI", "PRESS", "PRIME", "PRO", "PROD", "PRODUCTIONS", "PROF", "PROGRESSIVE", "PROMO", "PROPERTIES", "PROPERTY", "PROTECTION", "PRU", "PRUDENTIAL", "PS", "PT", "PUB", "PW", "PWC", "PY", "QA", "QPON", "QUEBEC", "QUEST", "RACING", "RADIO", "RE", "READ", "REALESTATE", "REALTOR", "REALTY", "RECIPES", "RED", "REDUMBRELLA", "REHAB", "REISE", "REISEN", "REIT", "RELIANCE", "REN", "RENT", "RENTALS", "REPAIR", "REPORT", "REPUBLICAN", "REST", "RESTAURANT", "REVIEW", "REVIEWS", "REXROTH", "RICH", "RICHARDLI", "RICOH", "RIL", "RIO", "RIP", "RO", "ROCKS", "RODEO", "ROGERS", "ROOM", "RS", "RSVP", "RU", "RUGBY", "RUHR", "RUN", "RW", "RWE", "RYUKYU", "SA", "SAARLAND", "SAFE", "SAFETY", "SAKURA", "SALE", "SALON", "SAMSCLUB", "SAMSUNG", "SANDVIK", "SANDVIKCOROMANT", "SANOFI", "SAP", "SARL", "SAS", "SAVE", "SAXO", "SB", "SBI", "SBS", "SC", "SCB", "SCHAEFFLER", "SCHMIDT", "SCHOLARSHIPS", "SCHOOL", "SCHULE", "SCHWARZ", "SCIENCE", "SCOT", "SD", "SE", "SEARCH", "SEAT", "SECURE", "SECURITY", "SEEK", "SELECT", "SENER", "SERVICES", "SEVEN", "SEW", "SEX", "SEXY", "SFR", "SG", "SH", "SHANGRILA", "SHARP", "SHELL", "SHIA", "SHIKSHA", "SHOES", "SHOP", "SHOPPING", "SHOUJI", "SHOW", "SI", "SILK", "SINA", "SINGLES", "SITE", "SJ", "SK", "SKI", "SKIN", "SKY", "SKYPE", "SL", "SLING", "SM", "SMART", "SMILE", "SN", "SNCF", "SO", "SOCCER", "SOCIAL", "SOFTBANK", "SOFTWARE", "SOHU", "SOLAR", "SOLUTIONS", "SONG", "SONY", "SOY", "SPA", "SPACE", "SPORT", "SPOT", "SR", "SRL", "SS", "ST", "STADA", "STAPLES", "STAR", "STATEBANK", "STATEFARM", "STC", "STCGROUP", "STOCKHOLM", "STORAGE", "STORE", "STREAM", "STUDIO", "STUDY", "STYLE", "SU", "SUCKS", "SUPPLIES", "SUPPLY", "SUPPORT", "SURF", "SURGERY", "SUZUKI", "SV", "SWATCH", "SWISS", "SX", "SY", "SYDNEY", "SYSTEMS", "SZ", "TAB", "TAIPEI", "TALK", "TAOBAO", "TARGET", "TATAMOTORS", "TATAR", "TATTOO", "TAX", "TAXI", "TC", "TCI", "TD", "TDK", "TEAM", "TECH", "TECHNOLOGY", "TEL", "TEMASEK", "TENNIS", "TEVA", "TF", "TG", "TH", "THD", "THEATER", "THEATRE", "TIAA", "TICKETS", "TIENDA", "TIPS", "TIRES", "TIROL", "TJ", "TJMAXX", "TJX", "TK", "TKMAXX", "TL", "TM", "TMALL", "TN", "TO", "TODAY", "TOKYO", "TOOLS", "TOP", "TORAY", "TOSHIBA", "TOTAL", "TOURS", "TOWN", "TOYOTA", "TOYS", "TR", "TRADE", "TRADING", "TRAINING", "TRAVEL", "TRAVELERS", "TRAVELERSINSURANCE", "TRUST", "TRV", "TT", "TUBE", "TUI", "TUNES", "TUSHU", "TV", "TVS", "TW", "TZ", "UA", "UBANK", "UBS", "UG", "UK", "UNICOM", "UNIVERSITY", "UNO", "UOL", "UPS", "US", "UY", "UZ", "VA", "VACATIONS", "VANA", "VANGUARD", "VC", "VE", "VEGAS", "VENTURES", "VERISIGN", "VERSICHERUNG", "VET", "VG", "VI", "VIAJES", "VIDEO", "VIG", "VIKING", "VILLAS", "VIN", "VIP", "VIRGIN", "VISA", "VISION", "VIVA", "VIVO", "VLAANDEREN", "VN", "VODKA", "VOLVO", "VOTE", "VOTING", "VOTO", "VOYAGE", "VU", "WALES", "WALMART", "WALTER", "WANG", "WANGGOU", "WATCH", "WATCHES", "WEATHER", "WEATHERCHANNEL", "WEBCAM", "WEBER", "WEBSITE", "WED", "WEDDING", "WEIBO", "WEIR", "WF", "WHOSWHO", "WIEN", "WIKI", "WILLIAMHILL", "WIN", "WINDOWS", "WINE", "WINNERS", "WME", "WOODSIDE", "WORK", "WORKS", "WORLD", "WOW", "WS", "WTC", "WTF", "XBOX", "XEROX", "XIHUAN", "XIN", "XN--11B4C3D", "XN--1CK2E1B", "XN--1QQW23A", "XN--2SCRJ9C", "XN--30RR7Y", "XN--3BST00M", "XN--3DS443G", "XN--3E0B707E", "XN--3HCRJ9C", "XN--3PXU8K", "XN--42C2D9A", "XN--45BR5CYL", "XN--45BRJ9C", "XN--45Q11C", "XN--4DBRK0CE", "XN--4GBRIM", "XN--54B7FTA0CC", "XN--55QW42G", "XN--55QX5D", "XN--5SU34J936BGSG", "XN--5TZM5G", "XN--6FRZ82G", "XN--6QQ986B3XL", "XN--80ADXHKS", "XN--80AO21A", "XN--80AQECDR1A", "XN--80ASEHDB", "XN--80ASWG", "XN--8Y0A063A", "XN--90A3AC", "XN--90AE", "XN--90AIS", "XN--9DBQ2A", "XN--9ET52U", "XN--9KRT00A", "XN--B4W605FERD", "XN--BCK1B9A5DRE4C", "XN--C1AVG", "XN--C2BR7G", "XN--CCK2B3B", "XN--CCKWCXETD", "XN--CG4BKI", "XN--CLCHC0EA0B2G2A9GCD", "XN--CZR694B", "XN--CZRS0T", "XN--CZRU2D", "XN--D1ACJ3B", "XN--D1ALF", "XN--E1A4C", "XN--ECKVDTC9D", "XN--EFVY88H", "XN--FCT429K", "XN--FHBEI", "XN--FIQ228C5HS", "XN--FIQ64B", "XN--FIQS8S", "XN--FIQZ9S", "XN--FJQ720A", "XN--FLW351E", "XN--FPCRJ9C3D", "XN--FZC2C9E2C", "XN--FZYS8D69UVGM", "XN--G2XX48C", "XN--GCKR3F0F", "XN--GECRJ9C", "XN--GK3AT1E", "XN--H2BREG3EVE", "XN--H2BRJ9C", "XN--H2BRJ9C8C", "XN--HXT814E", "XN--I1B6B1A6A2E", "XN--IMR513N", "XN--IO0A7I", "XN--J1AEF", "XN--J1AMH", "XN--J6W193G", "XN--JLQ480N2RG", "XN--JVR189M", "XN--KCRX77D1X4A", "XN--KPRW13D", "XN--KPRY57D", "XN--KPUT3I", "XN--L1ACC", "XN--LGBBAT1AD8J", "XN--MGB9AWBF", "XN--MGBA3A3EJT", "XN--MGBA3A4F16A", "XN--MGBA7C0BBN0A", "XN--MGBAAM7A8H", "XN--MGBAB2BD", "XN--MGBAH1A3HJKRD", "XN--MGBAI9AZGQP6J", "XN--MGBAYH7GPA", "XN--MGBBH1A", "XN--MGBBH1A71E", "XN--MGBC0A9AZCG", "XN--MGBCA7DZDO", "XN--MGBCPQ6GPA1A", "XN--MGBERP4A5D4AR", "XN--MGBGU82A", "XN--MGBI4ECEXP", "XN--MGBPL2FH", "XN--MGBT3DHD", "XN--MGBTX2B", "XN--MGBX4CD0AB", "XN--MIX891F", "XN--MK1BU44C", "XN--MXTQ1M", "XN--NGBC5AZD", "XN--NGBE9E0A", "XN--NGBRX", "XN--NODE", "XN--NQV7F", "XN--NQV7FS00EMA", "XN--NYQY26A", "XN--O3CW4H", "XN--OGBPF8FL", "XN--OTU796D", "XN--P1ACF", "XN--P1AI", "XN--PGBS0DH", "XN--PSSY2U", "XN--Q7CE6A", "XN--Q9JYB4C", "XN--QCKA1PMC", "XN--QXA6A", "XN--QXAM", "XN--RHQV96G", "XN--ROVU88B", "XN--RVC1E0AM3E", "XN--S9BRJ9C", "XN--SES554G", "XN--T60B56A", "XN--TCKWE", "XN--TIQ49XQYJ", "XN--UNUP4Y", "XN--VERMGENSBERATER-CTB", "XN--VERMGENSBERATUNG-PWB", "XN--VHQUV", "XN--VUQ861B", "XN--W4R85EL8FHU5DNRA", "XN--W4RS40L", "XN--WGBH1C", "XN--WGBL6A", "XN--XHQ521B", "XN--XKC2AL3HYE2A", "XN--XKC2DL3A5EE0H", "XN--Y9A3AQ", "XN--YFRO4I67O", "XN--YGBI2AMMX", "XN--ZFR164B", "XXX", "XYZ", "YACHTS", "YAHOO", "YAMAXUN", "YANDEX", "YE", "YODOBASHI", "YOGA", "YOKOHAMA", "YOU", "YOUTUBE", "YT", "YUN", "ZA", "ZAPPOS", "ZARA", "ZERO", "ZIP", "ZM", "ZONE", "ZUERICH", "ZW"];
      }, 6913(e2) {
        "use strict";
        e2.exports = { version: "18.2.1" };
      } }, t = {};
      function r(s) {
        var n = t[s];
        if (void 0 !== n) return n.exports;
        var a = t[s] = { exports: {} };
        return e[s](a, a.exports, r), a.exports;
      }
      return r.n = (e2) => {
        var t2 = e2 && e2.__esModule ? () => e2.default : () => e2;
        return r.d(t2, { a: t2 }), t2;
      }, r.d = (e2, t2) => {
        for (var s in t2) r.o(t2, s) && !r.o(e2, s) && Object.defineProperty(e2, s, { enumerable: true, get: t2[s] });
      }, r.o = (e2, t2) => Object.prototype.hasOwnProperty.call(e2, t2), r(1100);
    })());
  }
});
export default require_joi_browser_min();
//# sourceMappingURL=joi.js.map
