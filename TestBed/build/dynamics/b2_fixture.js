/*
* Copyright (c) 2006-2009 Erin Catto http://www.box2d.org
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/
System.register(["../common/b2_settings.js", "../common/b2_math.js", "../collision/b2_collision.js", "../collision/b2_shape.js"], function (exports_1, context_1) {
    "use strict";
    var b2_settings_js_1, b2_math_js_1, b2_collision_js_1, b2_shape_js_1, b2Filter, b2FixtureDef, b2FixtureProxy, b2Fixture;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (b2_settings_js_1_1) {
                b2_settings_js_1 = b2_settings_js_1_1;
            },
            function (b2_math_js_1_1) {
                b2_math_js_1 = b2_math_js_1_1;
            },
            function (b2_collision_js_1_1) {
                b2_collision_js_1 = b2_collision_js_1_1;
            },
            function (b2_shape_js_1_1) {
                b2_shape_js_1 = b2_shape_js_1_1;
            }
        ],
        execute: function () {
            /// This holds contact filtering data.
            b2Filter = class b2Filter {
                constructor() {
                    /// The collision category bits. Normally you would just set one bit.
                    this.categoryBits = 0x0001;
                    /// The collision mask bits. This states the categories that this
                    /// shape would accept for collision.
                    this.maskBits = 0xFFFF;
                    /// Collision groups allow a certain group of objects to never collide (negative)
                    /// or always collide (positive). Zero means no collision group. Non-zero group
                    /// filtering always wins against the mask bits.
                    this.groupIndex = 0;
                }
                Clone() {
                    return new b2Filter().Copy(this);
                }
                Copy(other) {
                    // DEBUG: b2Assert(this !== other);
                    this.categoryBits = other.categoryBits;
                    this.maskBits = other.maskBits;
                    this.groupIndex = other.groupIndex || 0;
                    return this;
                }
            };
            exports_1("b2Filter", b2Filter);
            b2Filter.DEFAULT = new b2Filter();
            /// A fixture definition is used to create a fixture. This class defines an
            /// abstract fixture definition. You can reuse fixture definitions safely.
            b2FixtureDef = class b2FixtureDef {
                constructor() {
                    /// Use this to store application specific fixture data.
                    this.userData = null;
                    /// The friction coefficient, usually in the range [0,1].
                    this.friction = 0.2;
                    /// The restitution (elasticity) usually in the range [0,1].
                    this.restitution = 0;
                    /// Restitution velocity threshold, usually in m/s. Collisions above this
                    /// speed have restitution applied (will bounce).
                    this.restitutionThreshold = 1.0 * b2_settings_js_1.b2_lengthUnitsPerMeter;
                    /// The density, usually in kg/m^2.
                    this.density = 0;
                    /// A sensor shape collects contact information but never generates a collision
                    /// response.
                    this.isSensor = false;
                    /// Contact filtering data.
                    this.filter = new b2Filter();
                }
            };
            exports_1("b2FixtureDef", b2FixtureDef);
            /// This proxy is used internally to connect fixtures to the broad-phase.
            b2FixtureProxy = class b2FixtureProxy {
                constructor(fixture, childIndex) {
                    this.aabb = new b2_collision_js_1.b2AABB();
                    this.childIndex = 0;
                    this.fixture = fixture;
                    this.childIndex = childIndex;
                    this.fixture.m_shape.ComputeAABB(this.aabb, this.fixture.m_body.GetTransform(), childIndex);
                    this.treeNode = this.fixture.m_body.m_world.m_contactManager.m_broadPhase.CreateProxy(this.aabb, this);
                }
                Reset() {
                    this.fixture.m_body.m_world.m_contactManager.m_broadPhase.DestroyProxy(this.treeNode);
                }
                Touch() {
                    this.fixture.m_body.m_world.m_contactManager.m_broadPhase.TouchProxy(this.treeNode);
                }
                Synchronize(transform1, transform2) {
                    if (transform1 === transform2) {
                        this.fixture.m_shape.ComputeAABB(this.aabb, transform1, this.childIndex);
                        this.fixture.m_body.m_world.m_contactManager.m_broadPhase.MoveProxy(this.treeNode, this.aabb, b2_math_js_1.b2Vec2.ZERO);
                    }
                    else {
                        // Compute an AABB that covers the swept shape (may miss some rotation effect).
                        const aabb1 = b2FixtureProxy.Synchronize_s_aabb1;
                        const aabb2 = b2FixtureProxy.Synchronize_s_aabb2;
                        this.fixture.m_shape.ComputeAABB(aabb1, transform1, this.childIndex);
                        this.fixture.m_shape.ComputeAABB(aabb2, transform2, this.childIndex);
                        this.aabb.Combine2(aabb1, aabb2);
                        const displacement = b2FixtureProxy.Synchronize_s_displacement;
                        displacement.Copy(aabb2.GetCenter()).SelfSub(aabb1.GetCenter());
                        this.fixture.m_body.m_world.m_contactManager.m_broadPhase.MoveProxy(this.treeNode, this.aabb, displacement);
                    }
                }
            };
            exports_1("b2FixtureProxy", b2FixtureProxy);
            b2FixtureProxy.Synchronize_s_aabb1 = new b2_collision_js_1.b2AABB();
            b2FixtureProxy.Synchronize_s_aabb2 = new b2_collision_js_1.b2AABB();
            b2FixtureProxy.Synchronize_s_displacement = new b2_math_js_1.b2Vec2();
            /// A fixture is used to attach a shape to a body for collision detection. A fixture
            /// inherits its transform from its parent. Fixtures hold additional non-geometric data
            /// such as friction, collision filters, etc.
            /// Fixtures are created via b2Body::CreateFixture.
            /// @warning you cannot reuse fixtures.
            b2Fixture = class b2Fixture {
                get m_proxyCount() { return this.m_proxies.length; }
                constructor(body, def) {
                    this.m_density = 0;
                    this.m_next = null;
                    this.m_friction = 0;
                    this.m_restitution = 0;
                    this.m_restitutionThreshold = 1.0 * b2_settings_js_1.b2_lengthUnitsPerMeter;
                    this.m_proxies = [];
                    this.m_filter = new b2Filter();
                    this.m_isSensor = false;
                    this.m_userData = null;
                    this.m_body = body;
                    this.m_shape = def.shape.Clone();
                    this.m_userData = b2_settings_js_1.b2Maybe(def.userData, null);
                    this.m_friction = b2_settings_js_1.b2Maybe(def.friction, 0.2);
                    this.m_restitution = b2_settings_js_1.b2Maybe(def.restitution, 0);
                    this.m_restitutionThreshold = b2_settings_js_1.b2Maybe(def.restitutionThreshold, 0);
                    this.m_filter.Copy(b2_settings_js_1.b2Maybe(def.filter, b2Filter.DEFAULT));
                    this.m_isSensor = b2_settings_js_1.b2Maybe(def.isSensor, false);
                    this.m_density = b2_settings_js_1.b2Maybe(def.density, 0);
                }
                Reset() {
                    // The proxies must be destroyed before calling this.
                    // DEBUG: b2Assert(this.m_proxyCount === 0);
                }
                /// Get the type of the child shape. You can use this to down cast to the concrete shape.
                /// @return the shape type.
                GetType() {
                    return this.m_shape.GetType();
                }
                /// Get the child shape. You can modify the child shape, however you should not change the
                /// number of vertices because this will crash some collision caching mechanisms.
                /// Manipulating the shape may lead to non-physical behavior.
                GetShape() {
                    return this.m_shape;
                }
                /// Set if this fixture is a sensor.
                SetSensor(sensor) {
                    if (sensor !== this.m_isSensor) {
                        this.m_body.SetAwake(true);
                        this.m_isSensor = sensor;
                    }
                }
                /// Is this fixture a sensor (non-solid)?
                /// @return the true if the shape is a sensor.
                IsSensor() {
                    return this.m_isSensor;
                }
                /// Set the contact filtering data. This will not update contacts until the next time
                /// step when either parent body is active and awake.
                /// This automatically calls Refilter.
                SetFilterData(filter) {
                    this.m_filter.Copy(filter);
                    this.Refilter();
                }
                /// Get the contact filtering data.
                GetFilterData() {
                    return this.m_filter;
                }
                /// Call this if you want to establish collision that was previously disabled by b2ContactFilter::ShouldCollide.
                Refilter() {
                    // Flag associated contacts for filtering.
                    let edge = this.m_body.GetContactList();
                    while (edge) {
                        const contact = edge.contact;
                        const fixtureA = contact.GetFixtureA();
                        const fixtureB = contact.GetFixtureB();
                        if (fixtureA === this || fixtureB === this) {
                            contact.FlagForFiltering();
                        }
                        edge = edge.next;
                    }
                    // Touch each proxy so that new pairs may be created
                    this.TouchProxies();
                }
                /// Get the parent body of this fixture. This is NULL if the fixture is not attached.
                /// @return the parent body.
                GetBody() {
                    return this.m_body;
                }
                /// Get the next fixture in the parent body's fixture list.
                /// @return the next shape.
                GetNext() {
                    return this.m_next;
                }
                /// Get the user data that was assigned in the fixture definition. Use this to
                /// store your application specific data.
                GetUserData() {
                    return this.m_userData;
                }
                /// Set the user data. Use this to store your application specific data.
                SetUserData(data) {
                    this.m_userData = data;
                }
                /// Test a point for containment in this fixture.
                /// @param p a point in world coordinates.
                TestPoint(p) {
                    return this.m_shape.TestPoint(this.m_body.GetTransform(), p);
                }
                // #if B2_ENABLE_PARTICLE
                ComputeDistance(p, normal, childIndex) {
                    return this.m_shape.ComputeDistance(this.m_body.GetTransform(), p, normal, childIndex);
                }
                // #endif
                /// Cast a ray against this shape.
                /// @param output the ray-cast results.
                /// @param input the ray-cast input parameters.
                RayCast(output, input, childIndex) {
                    return this.m_shape.RayCast(output, input, this.m_body.GetTransform(), childIndex);
                }
                /// Get the mass data for this fixture. The mass data is based on the density and
                /// the shape. The rotational inertia is about the shape's origin. This operation
                /// may be expensive.
                GetMassData(massData = new b2_shape_js_1.b2MassData()) {
                    this.m_shape.ComputeMass(massData, this.m_density);
                    return massData;
                }
                /// Set the density of this fixture. This will _not_ automatically adjust the mass
                /// of the body. You must call b2Body::ResetMassData to update the body's mass.
                SetDensity(density) {
                    this.m_density = density;
                }
                /// Get the density of this fixture.
                GetDensity() {
                    return this.m_density;
                }
                /// Get the coefficient of friction.
                GetFriction() {
                    return this.m_friction;
                }
                /// Set the coefficient of friction. This will _not_ change the friction of
                /// existing contacts.
                SetFriction(friction) {
                    this.m_friction = friction;
                }
                /// Get the coefficient of restitution.
                GetRestitution() {
                    return this.m_restitution;
                }
                /// Set the coefficient of restitution. This will _not_ change the restitution of
                /// existing contacts.
                SetRestitution(restitution) {
                    this.m_restitution = restitution;
                }
                /// Get the restitution velocity threshold.
                GetRestitutionThreshold() {
                    return this.m_restitutionThreshold;
                }
                /// Set the restitution threshold. This will _not_ change the restitution threshold of
                /// existing contacts.
                SetRestitutionThreshold(threshold) {
                    this.m_restitutionThreshold = threshold;
                }
                /// Get the fixture's AABB. This AABB may be enlarge and/or stale.
                /// If you need a more accurate AABB, compute it using the shape and
                /// the body transform.
                GetAABB(childIndex) {
                    // DEBUG: b2Assert(0 <= childIndex && childIndex < this.m_proxyCount);
                    return this.m_proxies[childIndex].aabb;
                }
                /// Dump this fixture to the log file.
                Dump(log, bodyIndex) {
                    log("    const fd: b2FixtureDef = new b2FixtureDef();\n");
                    log("    fd.friction = %.15f;\n", this.m_friction);
                    log("    fd.restitution = %.15f;\n", this.m_restitution);
                    log("    fd.restitutionThreshold = %.15f;\n", this.m_restitutionThreshold);
                    log("    fd.density = %.15f;\n", this.m_density);
                    log("    fd.isSensor = %s;\n", (this.m_isSensor) ? ("true") : ("false"));
                    log("    fd.filter.categoryBits = %d;\n", this.m_filter.categoryBits);
                    log("    fd.filter.maskBits = %d;\n", this.m_filter.maskBits);
                    log("    fd.filter.groupIndex = %d;\n", this.m_filter.groupIndex);
                    this.m_shape.Dump(log);
                    log("\n");
                    log("    fd.shape = shape;\n");
                    log("\n");
                    log("    bodies[%d].CreateFixture(fd);\n", bodyIndex);
                }
                // These support body activation/deactivation.
                CreateProxies() {
                    if (this.m_proxies.length !== 0) {
                        throw new Error();
                    }
                    // Create proxies in the broad-phase.
                    for (let i = 0; i < this.m_shape.GetChildCount(); ++i) {
                        this.m_proxies[i] = new b2FixtureProxy(this, i);
                    }
                }
                DestroyProxies() {
                    // Destroy proxies in the broad-phase.
                    for (const proxy of this.m_proxies) {
                        proxy.Reset();
                    }
                    this.m_proxies.length = 0;
                }
                TouchProxies() {
                    for (const proxy of this.m_proxies) {
                        proxy.Touch();
                    }
                }
                SynchronizeProxies(transform1, transform2) {
                    for (const proxy of this.m_proxies) {
                        proxy.Synchronize(transform1, transform2);
                    }
                }
            };
            exports_1("b2Fixture", b2Fixture);
        }
    };
});
//# sourceMappingURL=b2_fixture.js.map