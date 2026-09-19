import java.util.Scanner;
import java.util.Random;

public class GuessMyNumber {
	
	public static void main (String[] args) {
		
		// pick a random number
        Random random = new Random();
        int randomNumber = random.nextInt(100) + 1;
		
		// Get input
		System.out.println("I'm thinking of a number between 1 and 100");
		System.out.println("(including both). Can you guess what it is?");
		System.out.print("Type a number: ");
		Scanner in = new Scanner(System.in);
		int guess = in.nextInt();
		
		// Output
		System.out.println("Your guess is: " + guess);
		System.out.println("The number I was thinking of is: " + randomNumber);
		System.out.println("You were off by: " + (randomNumber - guess));	
	}
}
		
