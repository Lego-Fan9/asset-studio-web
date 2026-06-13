/*

    This file is written by ChatGPT. It is the only file I plan to write with gpt.

    Also it is awful.
    
*/

export const BuildTypes = {
    Alpha: "a",
    Beta: "b",
    Final: "f",
    Patch: "p",
    Tuanjie: "t",
} as const;

export type BuildType = typeof BuildTypes[keyof typeof BuildTypes];

type VersionTuple2 = [number, number];
type VersionTuple3 = [number, number, number];

export class UnityVersion {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly build: number;
    readonly buildType?: string;
    readonly fullVersion: string;

    constructor(version: string);
    constructor(major?: number, minor?: number, patch?: number);

    constructor(a?: string | number, b = 0, c = 0) {
        if (typeof a === "string") {
            const version = a;

            if (!version) {
                throw new Error("Unity version cannot be empty.");
            }

            try {
                const nums = version.match(/\d+/g)?.map(Number) ?? [];
                if (nums.length < 3) {
                    throw new Error();
                }

                this.major = nums[0];
                this.minor = nums[1];
                this.patch = nums[2];
                this.build = nums[3] ?? 0;
                this.fullVersion = version;
            } catch {
                throw new Error(`Failed to parse Unity version: "${version}".`);
            }

            const nonDigits = version.match(/\D+/g) ?? [];
            if (nonDigits.length > 2) {
                this.buildType = nonDigits[2];
            }
        } else {
            this.major = a ?? 0;
            this.minor = b;
            this.patch = c;

            this.fullVersion = `${this.major}.${this.minor}.${this.patch}`;

            if (!this.isStripped) {
                this.build = 1;
                this.buildType = BuildTypes.Final;
                this.fullVersion += `${this.buildType}${this.build}`;
            } else {
                this.build = 0;
            }
        }
    }

    get isStripped(): boolean {
        return this.major === 0 && this.minor === 0 && this.patch === 0;
    }

    get isAlpha(): boolean {
        return this.buildType === BuildTypes.Alpha;
    }

    get isBeta(): boolean {
        return this.buildType === BuildTypes.Beta;
    }

    get isPatch(): boolean {
        return this.buildType === BuildTypes.Patch;
    }

    get isTuanjie(): boolean {
        return (
            this.buildType === BuildTypes.Tuanjie &&
            this.compareToTuple3([2022, 3, 2]) >= 0
        );
    }

    static tryParse(version: string): { success: boolean; value: UnityVersion | null } {
        try {
            return { success: true, value: new UnityVersion(version) };
        } catch {
            return { success: false, value: null };
        }
    }

    compareTo(other: UnityVersion | VersionTuple2 | VersionTuple3): number {
        if (other instanceof UnityVersion) {
            return this.compareToTuple3([other.major, other.minor, other.patch]);
        }

        if (other.length === 2) {
            return this.compareToTuple2(other);
        }

        return this.compareToTuple3(other);
    }

    private compareToTuple2(other: VersionTuple2): number {
        const [om, on] = other;

        if (this.major !== om) return this.major - om;
        if (this.minor !== on) return this.minor - on;
        return 0;
    }

    private compareToTuple3(other: VersionTuple3): number {
        const [om, on, op] = other;

        const r = this.compareToTuple2([om, on]);
        if (r !== 0) return r;

        return this.patch - op;
    }

    equals(other: UnityVersion): boolean {
        return (
            this.major === other.major &&
            this.minor === other.minor &&
            this.patch === other.patch
        );
    }

    getHashCode(): number {
        let result = this.major * 31;
        result = result * 31 + this.minor;
        result = result * 31 + this.patch;
        result = result * 31 + this.build;
        return result;
    }

    toTuple(): [number, number, number] {
        return [this.major, this.minor, this.patch];
    }

    toArray(): number[] {
        return [this.major, this.minor, this.patch];
    }

    toString(): string {
        return this.fullVersion;
    }
}

export function isInRange(
    ver: UnityVersion,
    lower: UnityVersion | number | VersionTuple2 | VersionTuple3,
    upper: UnityVersion | number | VersionTuple2 | VersionTuple3
): boolean {
    const geLower = compareLower(ver, lower) >= 0;
    const ltUpper = compareUpper(ver, upper) < 0;
    return geLower && ltUpper;
}

function compareLower(
    ver: UnityVersion,
    lower: UnityVersion | number | VersionTuple2 | VersionTuple3
): number {
    if (lower instanceof UnityVersion) return ver.compareTo(lower);
    if (typeof lower === "number") return ver.major - lower;
    return ver.compareTo(lower);
}

function compareUpper(
    ver: UnityVersion,
    upper: UnityVersion | number | VersionTuple2 | VersionTuple3
): number {
    if (upper instanceof UnityVersion) return ver.compareTo(upper);
    if (typeof upper === "number") return ver.major - upper;
    return ver.compareTo(upper);
}