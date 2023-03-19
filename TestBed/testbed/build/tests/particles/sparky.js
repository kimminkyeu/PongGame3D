/*
* Copyright (c) 2006-2012 Erin Catto http://www.box2d.org
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
System.register(["@box2d", "@testbed"], function (exports_1, context_1) {
    "use strict";
    var b2, testbed, ParticleVFX, Sparky, testIndex;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (b2_1) {
                b2 = b2_1;
            },
            function (testbed_1) {
                testbed = testbed_1;
            }
        ],
        execute: function () {
            ParticleVFX = class ParticleVFX {
                constructor(particleSystem, origin, size, speed, lifetime, particleFlags) {
                    this.m_initialLifetime = 0.0;
                    this.m_remainingLifetime = 0.0;
                    this.m_halfLifetime = 0.0;
                    this.m_origColor = new b2.Color();
                    // Create a circle to house the particles of size size
                    const shape = new b2.CircleShape();
                    shape.m_p.Copy(origin);
                    shape.m_radius = size;
                    // Create particle def of random color.
                    const pd = new b2.ParticleGroupDef();
                    pd.flags = particleFlags;
                    pd.shape = shape;
                    // this.m_origColor.Set(
                    //   Math.random(),
                    //   Math.random(),
                    //   Math.random(),
                    //   1.0);
                    function hue2rgb(p, q, t) {
                        if (t < 0) {
                            t += 1;
                        }
                        if (t > 1) {
                            t -= 1;
                        }
                        if (t < 1 / 6) {
                            return p + (q - p) * 6 * t;
                        }
                        if (t < 1 / 2) {
                            return q;
                        }
                        if (t < 2 / 3) {
                            return p + (q - p) * (2 / 3 - t) * 6;
                        }
                        return p;
                    }
                    function hslToRgb(h, s, l, a = 1) {
                        let r, g, b;
                        if (s === 0) {
                            r = g = b = l; // achromatic
                        }
                        else {
                            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                            const p = 2 * l - q;
                            r = hue2rgb(p, q, h + 1 / 3);
                            g = hue2rgb(p, q, h);
                            b = hue2rgb(p, q, h - 1 / 3);
                        }
                        return { r, g, b, a };
                    }
                    this.m_origColor.Copy(hslToRgb(Math.random(), 1, 0.5));
                    pd.color.Copy(this.m_origColor);
                    this.m_particleSystem = particleSystem;
                    // Create a circle full of particles
                    this.m_pg = this.m_particleSystem.CreateParticleGroup(pd);
                    this.m_initialLifetime = this.m_remainingLifetime = lifetime;
                    this.m_halfLifetime = this.m_initialLifetime * 0.5;
                    // Set particle initial velocity based on how far away it is from
                    // origin, exploding outwards.
                    const bufferIndex = this.m_pg.GetBufferIndex();
                    const pos = this.m_particleSystem.GetPositionBuffer();
                    const vel = this.m_particleSystem.GetVelocityBuffer();
                    for (let i = bufferIndex; i < bufferIndex + this.m_pg.GetParticleCount(); i++) {
                        ///  vel[i] = pos[i] - origin;
                        b2.Vec2.SubVV(pos[i], origin, vel[i]);
                        ///  vel[i] *= speed;
                        b2.Vec2.MulVS(vel[i], speed, vel[i]);
                    }
                }
                Drop() {
                    this.m_pg.DestroyParticles(false);
                    // this.m_pg = null;
                }
                ColorCoeff() {
                    if (this.m_remainingLifetime >= this.m_halfLifetime) {
                        return 1.0;
                    }
                    return 1.0 - ((this.m_halfLifetime - this.m_remainingLifetime) / this.m_halfLifetime);
                }
                Step(dt) {
                    if (dt > 0 && this.m_remainingLifetime > 0.0) {
                        this.m_remainingLifetime = Math.max(this.m_remainingLifetime - dt, 0.0);
                        const coeff = this.ColorCoeff();
                        const colors = this.m_particleSystem.GetColorBuffer();
                        const bufferIndex = this.m_pg.GetBufferIndex();
                        // Set particle colors all at once.
                        for (let i = bufferIndex; i < bufferIndex + this.m_pg.GetParticleCount(); i++) {
                            const c = colors[i];
                            // c *= coeff;
                            // c.SelfMul(coeff);
                            // c.a = this.m_origColor.a;
                            c.a *= coeff;
                        }
                    }
                }
                IsDone() {
                    return this.m_remainingLifetime <= 0.0;
                }
            };
            Sparky = class Sparky extends testbed.Test {
                constructor() {
                    super();
                    this.m_VFXIndex = 0;
                    this.m_VFX = [];
                    this.m_contact = false;
                    this.m_contactPoint = new b2.Vec2();
                    // Set up array of sparks trackers.
                    this.m_VFXIndex = 0;
                    for (let i = 0; i < Sparky.c_maxVFX; i++) {
                        this.m_VFX[i] = null;
                    }
                    this.CreateWalls();
                    this.m_particleSystem.SetRadius(0.25 * 2); // HACK: increase particle radius
                    // Create a list of circles that will spark.
                    for (let i = 0; i < Sparky.c_maxCircles; i++) {
                        const bd = new b2.BodyDef();
                        bd.type = b2.BodyType.b2_dynamicBody;
                        const body = this.m_world.CreateBody(bd);
                        const shape = new b2.CircleShape();
                        shape.m_p.Set(3.0 * testbed.RandomFloat(), Sparky.SHAPE_HEIGHT_OFFSET + Sparky.SHAPE_OFFSET * i);
                        shape.m_radius = 2;
                        const f = body.CreateFixture(shape, 0.5);
                        // Tag this as a sparkable body.
                        f.SetUserData({
                            spark: true,
                        });
                    }
                    testbed.Test.SetRestartOnParticleParameterChange(false);
                    testbed.Test.SetParticleParameterValue(b2.ParticleFlag.b2_powderParticle);
                }
                BeginContact(contact) {
                    super.BeginContact(contact);
                    // Check to see if these are two circles hitting one another.
                    const userA = contact.GetFixtureA().GetUserData();
                    const userB = contact.GetFixtureB().GetUserData();
                    if ((userA && userA.spark) ||
                        (userB && userB.spark)) {
                        const worldManifold = new b2.WorldManifold();
                        contact.GetWorldManifold(worldManifold);
                        // Note that we overwrite any contact; if there are two collisions
                        // on the same frame, only the last one showers sparks.
                        // Two collisions are rare, and this also guarantees we will not
                        // run out of places to store ParticleVFX explosions.
                        this.m_contactPoint.Copy(worldManifold.points[0]);
                        this.m_contact = true;
                    }
                }
                Step(settings) {
                    const particleFlags = testbed.Test.GetParticleParameterValue();
                    let dt = settings.m_hertz > 0.0 ? 1.0 / settings.m_hertz : 0.0;
                    if (settings.m_pause && !settings.m_singleStep) {
                        dt = 0.0;
                    }
                    super.Step(settings);
                    // If there was a contacts...
                    if (this.m_contact) {
                        // ...explode!
                        this.AddVFX(this.m_contactPoint, particleFlags);
                        this.m_contact = false;
                    }
                    // Step particle explosions.
                    for (let i = 0; i < Sparky.c_maxVFX; i++) {
                        const vfx = this.m_VFX[i];
                        if (vfx === null) {
                            continue;
                        }
                        vfx.Step(dt);
                        if (vfx.IsDone()) {
                            /// delete vfx;
                            vfx.Drop();
                            this.m_VFX[i] = null;
                        }
                    }
                }
                AddVFX(p, particleFlags) {
                    const vfx = this.m_VFX[this.m_VFXIndex];
                    if (vfx !== null) {
                        /// delete vfx;
                        vfx.Drop();
                        this.m_VFX[this.m_VFXIndex] = null;
                    }
                    this.m_VFX[this.m_VFXIndex] = new ParticleVFX(this.m_particleSystem, p, testbed.RandomFloat(1.0, 2.0), testbed.RandomFloat(10.0, 20.0), testbed.RandomFloat(0.5, 1.0), particleFlags);
                    if (++this.m_VFXIndex >= Sparky.c_maxVFX) {
                        this.m_VFXIndex = 0;
                    }
                }
                CreateWalls() {
                    // Create the walls of the world.
                    {
                        const bd = new b2.BodyDef();
                        const ground = this.m_world.CreateBody(bd);
                        {
                            const shape = new b2.PolygonShape();
                            const vertices = [
                                new b2.Vec2(-40, -10),
                                new b2.Vec2(40, -10),
                                new b2.Vec2(40, 0),
                                new b2.Vec2(-40, 0),
                            ];
                            shape.Set(vertices, 4);
                            ground.CreateFixture(shape, 0.0);
                        }
                        {
                            const shape = new b2.PolygonShape();
                            const vertices = [
                                new b2.Vec2(-40, 40),
                                new b2.Vec2(40, 40),
                                new b2.Vec2(40, 50),
                                new b2.Vec2(-40, 50),
                            ];
                            shape.Set(vertices, 4);
                            ground.CreateFixture(shape, 0.0);
                        }
                        {
                            const shape = new b2.PolygonShape();
                            const vertices = [
                                new b2.Vec2(-40, -10),
                                new b2.Vec2(-20, -10),
                                new b2.Vec2(-20, 50),
                                new b2.Vec2(-40, 50),
                            ];
                            shape.Set(vertices, 4);
                            ground.CreateFixture(shape, 0.0);
                        }
                        {
                            const shape = new b2.PolygonShape();
                            const vertices = [
                                new b2.Vec2(20, -10),
                                new b2.Vec2(40, -10),
                                new b2.Vec2(40, 50),
                                new b2.Vec2(20, 50),
                            ];
                            shape.Set(vertices, 4);
                            ground.CreateFixture(shape, 0.0);
                        }
                    }
                }
                static Create() {
                    return new Sparky();
                }
            };
            exports_1("Sparky", Sparky);
            Sparky.c_maxCircles = 3; ///6;
            Sparky.c_maxVFX = 20; ///50;
            Sparky.SHAPE_HEIGHT_OFFSET = 7;
            Sparky.SHAPE_OFFSET = 4.5;
            exports_1("testIndex", testIndex = testbed.RegisterTest("Particles", "Sparky", Sparky.Create));
        }
    };
});
//# sourceMappingURL=sparky.js.map