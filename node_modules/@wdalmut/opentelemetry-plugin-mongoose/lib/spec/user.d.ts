import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    email: string;
    firstName: string;
    lastName: string;
    age: number;
}
declare const _default: mongoose.Model<IUser, {}>;
export default _default;
